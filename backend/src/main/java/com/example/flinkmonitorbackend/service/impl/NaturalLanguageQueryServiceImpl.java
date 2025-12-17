package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.service.DatabaseMetadataService;
import com.example.flinkmonitorbackend.service.NaturalLanguageQueryService;
import com.example.flinkmonitorbackend.service.LlmService;
import com.example.flinkmonitorbackend.service.McpClientService;
import com.example.flinkmonitorbackend.service.strategy.SqlGenerationStrategyManager;
import com.example.flinkmonitorbackend.utils.SqlExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 自然语言查询服务实现类
 */
@Service
public class NaturalLanguageQueryServiceImpl implements NaturalLanguageQueryService {

    private static final Logger logger = LoggerFactory.getLogger(NaturalLanguageQueryServiceImpl.class);

    @Autowired
    private SqlExecutor sqlExecutor;
    
    @Autowired
    private DatabaseMetadataService databaseMetadataService;
    
    @Autowired
    private LlmService llmService;
    
    @Autowired
    private McpClientService mcpClientService;
    
    @Autowired
    private SqlGenerationStrategyManager sqlGenerationStrategyManager;

    private static final Map<String, String> TABLE_NAME_MAPPINGS = new HashMap<>();
    private static final Map<String, String> COLUMN_NAME_MAPPINGS = new HashMap<>();
    
    static {
        // 初始化表名映射，用于将自然语言中的表名映射到实际表名
        TABLE_NAME_MAPPINGS.put("部门", "organizations");
        TABLE_NAME_MAPPINGS.put("组织", "organizations");
        TABLE_NAME_MAPPINGS.put("员工", "employee");
        TABLE_NAME_MAPPINGS.put("请假", "hrbp_leave_record");
        TABLE_NAME_MAPPINGS.put("加班", "overtime_records");
        TABLE_NAME_MAPPINGS.put("异常工时", "exceptional_hours_records");
        TABLE_NAME_MAPPINGS.put("门禁", "hrbp_gate_record");
        TABLE_NAME_MAPPINGS.put("排班", "hrbp_schedule_shift");
        TABLE_NAME_MAPPINGS.put("出差", "hrbp_trip_record");
        TABLE_NAME_MAPPINGS.put("连续工作", "consecutive_work_days");
        
        // 初始化列名映射，用于将自然语言中的列名映射到实际列名
        COLUMN_NAME_MAPPINGS.put("部门名称", "org_name");
        COLUMN_NAME_MAPPINGS.put("部门代码", "org_code");
        COLUMN_NAME_MAPPINGS.put("员工ID", "emp_id");
        COLUMN_NAME_MAPPINGS.put("请假小时数", "leave_hours");
        COLUMN_NAME_MAPPINGS.put("加班小时数", "overtime_hours");
        COLUMN_NAME_MAPPINGS.put("状态", "status");
        COLUMN_NAME_MAPPINGS.put("连续工作天数", "consecutive_days");
        COLUMN_NAME_MAPPINGS.put("工作日期", "work_date");
        COLUMN_NAME_MAPPINGS.put("总请假小时数", "total_leave_hours");
        COLUMN_NAME_MAPPINGS.put("总加班小时数", "total_overtime_hours");
        COLUMN_NAME_MAPPINGS.put("净加班小时数", "net_overtime_hours");
    }

    /**
     * 将自然语言转换为SQL查询并执行
     */
    @Override
    public List<Map<String, Object>> executeNaturalLanguageQuery(String naturalLanguageQuery) {
        logger.info("执行自然语言查询: {}", naturalLanguageQuery);
        // 使用策略管理器生成SQL
        String sql = translateToSql(naturalLanguageQuery);
        // 执行SQL查询
        try {
            logger.info("执行SQL查询: {}", sql);
            return sqlExecutor.executeQuery(sql);
        } catch (SQLException e) {
            logger.error("SQL查询执行失败: {}", e.getMessage(), e);
            throw new RuntimeException("SQL查询执行失败: " + e.getMessage(), e);
        }
    }
    
    /**
     * 执行自然语言查询并返回包含评估结果的数据
     */
    @Override
    public Map<String, Object> executeNaturalLanguageQueryWithEvaluation(String naturalLanguageQuery) {
        logger.info("执行自然语言查询带评估: {}", naturalLanguageQuery);
        // 首先尝试直接调用MCP获取结果
        Map<String, Object> mcpResult = executeNaturalLanguageQueryWithMcp(naturalLanguageQuery);
        if (mcpResult != null && mcpResult.get("success") != null && (Boolean) mcpResult.get("success")) {
            logger.info("MCP调用成功，返回结果");
            return mcpResult;
        }
        
        // 如果MCP调用失败或不适用，回退到SQL生成方式
        String sql = translateToSql(naturalLanguageQuery);
        // 执行SQL查询
        List<Map<String, Object>> results;
        try {
            logger.info("执行SQL查询: {}", sql);
            results = sqlExecutor.executeQuery(sql);
        } catch (SQLException e) {
            logger.error("SQL查询执行失败: {}", e.getMessage(), e);
            throw new RuntimeException("SQL查询执行失败: " + e.getMessage(), e);
        }
        
        // 评估查询结果
        String evaluation = llmService.evaluateSqlResults(naturalLanguageQuery, sql, results);
        
        // 返回包含结果和评估的数据
        Map<String, Object> result = new HashMap<>();
        result.put("query", naturalLanguageQuery);
        result.put("sql", sql);
        result.put("results", results);
        result.put("evaluation", evaluation);
        result.put("method", "sql");
        
        logger.info("查询完成，返回结果包含 {} 条记录", results.size());
        return result;
    }
    
    /**
     * 执行自然语言查询并返回包含评估结果的数据
     */
    @Override
    public Map<String, Object> executeSqlWithEvaluation(String sql, String originalQuery) {
        // 执行SQL查询
        List<Map<String, Object>> results;
        try {
            results = sqlExecutor.executeQuery(sql);
        } catch (SQLException e) {
            throw new RuntimeException("SQL查询执行失败: " + e.getMessage(), e);
        }
        
        // 评估查询结果
        String evaluation = llmService.evaluateSqlResults(originalQuery, sql, results);
        
        // 返回包含结果和评估的数据
        Map<String, Object> result = new HashMap<>();
        result.put("query", originalQuery);
        result.put("sql", sql);
        result.put("results", results);
        result.put("evaluation", evaluation);
        return result;
    }

    /**
     * 将自然语言转换为SQL查询语句（不执行）
     * 优先使用策略管理器生成SQL，然后进行安全检查
     */
    @Override
    public String translateToSql(String naturalLanguageQuery) {
        logger.info("将自然语言转换为SQL: {}", naturalLanguageQuery);
        
        // 使用策略管理器生成SQL
        String sql = sqlGenerationStrategyManager.generateSql(naturalLanguageQuery);
        logger.info("生成SQL: {}", sql);
        
        // 增强SQL安全检查
        if (!isSqlSafeEnhanced(sql)) {
            logger.warn("SQL安全检查失败，返回安全查询: {}", sql);
            return "SELECT id, org_name, org_code, is_active FROM organizations WHERE is_active = 1 LIMIT 10";
        }
        
        logger.info("SQL安全检查通过，返回生成的SQL");
        return sql;
    }
    
    /**
     * 使用MCP执行自然语言查询
     */
    private Map<String, Object> executeNaturalLanguageQueryWithMcp(String naturalLanguageQuery) {
        try {
            logger.info("尝试使用MCP执行自然语言查询: {}", naturalLanguageQuery);
            // 分析自然语言查询，确定要调用的API
            String normalizedQuery = naturalLanguageQuery.toLowerCase();
            String apiId = null;
            
            // 简单的规则匹配
            if (normalizedQuery.contains("部门") && normalizedQuery.contains("统计")) {
                apiId = "get_department_statistics";
            } else if (normalizedQuery.contains("员工") && normalizedQuery.contains("请假")) {
                apiId = "get_employee_leave_records";
            } else if (normalizedQuery.contains("加班") && normalizedQuery.contains("记录")) {
                apiId = "get_overtime_records";
            } else if (normalizedQuery.contains("连续工作")) {
                apiId = "get_consecutive_work_days";
            } else if (normalizedQuery.contains("异常工时")) {
                apiId = "get_exceptional_hours_records";
            } else if (normalizedQuery.contains("门禁") && normalizedQuery.contains("记录")) {
                apiId = "get_gate_records";
            } else if (normalizedQuery.contains("报表") && normalizedQuery.contains("生成")) {
                apiId = "generate_report";
            }
            
            if (apiId != null) {
                // 提取查询中的参数
                Map<String, Object> params = extractParamsFromQuery(naturalLanguageQuery);
                
                // 执行API调用
                Object apiResult = mcpClientService.executeEnhancedApiCall(apiId, params);
                
                // 评估API调用结果
                String evaluation = llmService.evaluateSqlResults(naturalLanguageQuery, "API调用: " + apiId, apiResult);
                
                // 返回包含结果和评估的数据
                Map<String, Object> result = new HashMap<>();
                result.put("query", naturalLanguageQuery);
                result.put("method", "mcp");
                result.put("apiId", apiId);
                result.put("params", params);
                result.put("results", apiResult);
                result.put("evaluation", evaluation);
                result.put("success", true);
                
                logger.info("MCP调用成功，返回结果");
                return result;
            }
            
            logger.info("未匹配到合适的API，回退到SQL方式");
            return null;
        } catch (Exception e) {
            logger.error("MCP调用失败，将回退到SQL方式: {}", e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * 增强的SQL安全检查
     * @param sql SQL查询语句
     * @return 是否安全
     */
    private boolean isSqlSafeEnhanced(String sql) {
        // 首先调用原有的SQL安全检查
        boolean isSafe = llmService.isSqlSafe(sql);
        if (!isSafe) {
            return false;
        }
        
        // 增强的安全检查
        String lowerSql = sql.toLowerCase();
        
        // 检查是否包含危险的SQL关键字
        String[] dangerousKeywords = {
            "drop", "delete", "update", "insert", "truncate", "alter", "create", "drop", 
            "grant", "revoke", "execute", "call", "declare", "set", "use", "backup", "restore",
            "union", "except", "intersect", "into", "load", "outfile", "dumpfile"
        };
        
        // 使用正则表达式检查完整关键字，避免匹配表名或列名中的子字符串
        for (String keyword : dangerousKeywords) {
            // 关键字前后必须是边界字符（空格、括号、逗号、分号等）
            String pattern = "\\b" + keyword + "\\b";
            if (lowerSql.matches(".*" + pattern + ".*")) {
                logger.warn("SQL包含危险关键字: {}", keyword);
                return false;
            }
        }
        
        // 检查是否包含注释
        if (lowerSql.contains("--") || lowerSql.contains("/*") || lowerSql.contains("#")) {
            logger.warn("SQL包含注释，可能存在安全风险");
            return false;
        }
        
        // 检查是否包含多个语句
        if (lowerSql.contains(";")) {
            logger.warn("SQL包含多个语句，可能存在注入风险");
            return false;
        }
        
        // 检查是否包含通配符删除
        if (lowerSql.contains("* from") && lowerSql.contains("where 1=1")) {
            logger.warn("SQL包含潜在的通配符注入风险");
            return false;
        }
        
        return true;
    }
    
    /**
     * 将自然语言转换为SQL查询语句并生成评估结果（不执行）
     */
    @Override
    public Map<String, Object> translateToSqlWithEvaluation(String naturalLanguageQuery) {
        logger.info("将自然语言转换为SQL并生成评估: {}", naturalLanguageQuery);
        
        // 使用策略管理器生成SQL
        String sql = sqlGenerationStrategyManager.generateSql(naturalLanguageQuery);
        logger.info("生成SQL: {}", sql);
        
        // 构建结果，不执行SQL，仅返回SQL和安全性评估
        Map<String, Object> result = new HashMap<>();
        result.put("query", naturalLanguageQuery);
        result.put("sql", sql);
        result.put("safe", isSqlSafeEnhanced(sql));
        result.put("evaluation", "SQL语句已生成，未执行，无法提供详细评估结果。建议执行SQL后查看详细评估。");
        
        logger.info("SQL转换和评估完成");
        return result;
    }
    
    /**
     * 从查询中提取参数
     */
    private Map<String, Object> extractParamsFromQuery(String naturalLanguageQuery) {
        Map<String, Object> params = new HashMap<>();
        
        // 简单的参数提取示例，使用字符串处理代替正则表达式，避免转义字符问题
        String normalizedQuery = naturalLanguageQuery.toLowerCase();
        
        // 提取日期范围
        if (normalizedQuery.contains("最近") && normalizedQuery.contains("天")) {
            int startIndex = normalizedQuery.indexOf("最近") + 2;
            int endIndex = normalizedQuery.indexOf("天", startIndex);
            if (endIndex > startIndex) {
                String daysStr = normalizedQuery.substring(startIndex, endIndex).trim();
                try {
                    int days = Integer.parseInt(daysStr);
                    params.put("days", days);
                } catch (NumberFormatException e) {
                    // 忽略无效数字
                }
            }
        }
        
        // 提取部门ID - 简单实现，不使用正则表达式
        if (normalizedQuery.contains("部门") || normalizedQuery.contains("org")) {
            // 简单实现，直接返回默认部门ID
            params.put("orgId", "default");
        }
        
        // 提取员工ID - 简单实现，不使用正则表达式
        if (normalizedQuery.contains("员工") || normalizedQuery.contains("emp")) {
            // 简单实现，直接返回默认员工ID
            params.put("empId", "default");
        }
        
        return params;
    }
    
    /**
     * 匹配模板查询
     */
    private String matchTemplateQuery(String normalizedQuery) {
        Map<String, String> sqlTemplates = new HashMap<>();

        // 添加支持的查询模板
        sqlTemplates.put("查询所有部门的总请假小时数排行", 
                "SELECT o.org_name, o.org_code, SUM(l.leave_hours) AS total_leave_hours " +
                "FROM hrbp_leave_record l JOIN organizations o ON l.org_id = o.id " +
                "GROUP BY o.id, o.org_name, o.org_code ORDER BY total_leave_hours DESC");

        sqlTemplates.put("计算各部门的净加班小时数", 
                "SELECT o.org_name, o.org_code, " +
                "COALESCE(ot.overtime_hours, 0) AS total_overtime_hours, " +
                "COALESCE(l.leave_hours, 0) AS total_leave_hours, " +
                "(COALESCE(ot.overtime_hours, 0) - COALESCE(l.leave_hours, 0)) AS net_overtime_hours " +
                "FROM organizations o " +
                "LEFT JOIN (SELECT e.org_id, SUM(ot.overtime_hours) AS overtime_hours " +
                "           FROM overtime_records ot " +
                "           JOIN exceptional_hours_records e ON ot.emp_id = e.emp_id " +
                "           GROUP BY e.org_id) ot ON o.id = ot.org_id " +
                "LEFT JOIN (SELECT org_id, SUM(leave_hours) AS leave_hours FROM hrbp_leave_record GROUP BY org_id) l ON o.id = l.org_id " +
                "ORDER BY net_overtime_hours DESC");

        sqlTemplates.put("查询状态为待处理的异常工时记录数量", 
                "SELECT COUNT(*) AS pending_exceptional_records " +
                "FROM exceptional_hours_records WHERE status = 'pending'");

        sqlTemplates.put("找出连续工作天数最多的前5名员工", 
                "SELECT emp_id, MAX(consecutive_days) AS max_consecutive_days " +
                "FROM consecutive_work_days " +
                "GROUP BY emp_id ORDER BY max_consecutive_days DESC LIMIT 5");

        // 检查是否匹配任何模板
        for (Map.Entry<String, String> entry : sqlTemplates.entrySet()) {
            if (normalizedQuery.contains(entry.getKey().toLowerCase())) {
                return entry.getValue();
            }
        }
        
        return null;
    }
    
    /**
     * 根据表名映射生成SQL查询
     */
    private String generateSqlFromTableMapping(String query) {
        // 检查是否包含已知的表名，使用不区分大小写的匹配
        for (Map.Entry<String, String> mapping : TABLE_NAME_MAPPINGS.entrySet()) {
            String mappingKey = mapping.getKey().toLowerCase();
            String normalizedQuery = query.toLowerCase();
            
            if (normalizedQuery.contains(mappingKey)) {
                String actualTableName = mapping.getValue();
                
                // 从数据库元数据中获取表的重要列，减少硬编码
                List<String> columns = getImportantColumnsForTable(actualTableName);
                
                // 生成SQL查询，使用获取到的重要列而不是*，减少不必要的数据传输
                String columnList = columns.isEmpty() ? "*" : String.join(", ", columns);
                String sql = String.format("SELECT %s FROM %s", columnList, actualTableName);
                
                // 添加简单的过滤条件
                if (normalizedQuery.contains("状态") || normalizedQuery.contains("status")) {
                    if (normalizedQuery.contains("待处理") || normalizedQuery.contains("pending")) {
                        sql += " WHERE status = 'pending'";
                    }
                    if (normalizedQuery.contains("已处理") || normalizedQuery.contains("processed")) {
                        sql += " WHERE status = 'processed'";
                    }
                    if (normalizedQuery.contains("已批准") || normalizedQuery.contains("approved")) {
                        sql += " WHERE status = 'approved'";
                    }
                }
                
                // 添加排序（使用数据库元数据获取合适的排序字段）
                if (normalizedQuery.contains("排行") || normalizedQuery.contains("排名") || normalizedQuery.contains("order")) {
                    sql += " ORDER BY " + getDefaultOrderColumn(actualTableName) + " DESC";
                } else {
                    // 默认排序
                    sql += " ORDER BY " + getDefaultOrderColumn(actualTableName) + " DESC";
                }
                
                // 添加分页
                sql += " LIMIT 10";
                
                return sql;
            }
        }
        
        return null;
    }
    
    /**
     * 使用正则表达式生成SQL查询
     */
    private String generateSqlFromRegex(String query) {
        // 匹配 "查询[组织/部门]的[指标]" 模式
        // 使用字符串处理代替正则表达式，避免转义字符问题
        if (query.contains("查询") && query.contains("的")) {
            int startIndex = query.indexOf("查询") + 2;
            int endIndex = query.indexOf("的", startIndex);
            if (endIndex > startIndex) {
                String dept = query.substring(startIndex, endIndex).trim();
                String metric = query.substring(endIndex + 1).trim();
                
                if (metric.contains("请假")) {
                    return String.format(
                            "SELECT o.org_name, o.org_code, SUM(l.leave_hours) AS total_leave_hours " +
                            "FROM hrbp_leave_record l JOIN organizations o ON l.org_id = o.id " +
                            "GROUP BY o.id, o.org_name, o.org_code ORDER BY total_leave_hours DESC" +
                            (dept.contains("前") ? " LIMIT " + extractNumber(dept) : "")
                    );
                }
                
                if (metric.contains("加班")) {
                    return String.format(
                            "SELECT o.org_name, o.org_code, SUM(ot.overtime_hours) AS total_overtime_hours " +
                            "FROM overtime_records ot JOIN exceptional_hours_records e ON ot.emp_id = e.emp_id " +
                            "JOIN organizations o ON e.org_id = o.id " +
                            "GROUP BY o.id, o.org_name, o.org_code ORDER BY total_overtime_hours DESC" +
                            (dept.contains("前") ? " LIMIT " + extractNumber(dept) : "")
                    );
                }
            }
        }

        // 匹配 "查询[表名]" 模式
        if (query.contains("查询")) {
            String tableDesc = query.substring(2).trim();
            for (Map.Entry<String, String> mapping : TABLE_NAME_MAPPINGS.entrySet()) {
                if (tableDesc.contains(mapping.getKey())) {
                    String actualTableName = mapping.getValue();
                    return String.format("SELECT * FROM %s LIMIT 10", actualTableName);
                }
            }
        }
        
        return null;
    }
    
    /**
     * 利用数据库元数据生成SQL查询
     */
    private String generateSqlFromMetadata(String query) {
        try {
            // 获取所有表信息
            List<Map<String, Object>> tables = databaseMetadataService.getAllTables();
            
            // 尝试匹配最相关的表
            String bestMatchTable = tables.stream()
                    .map(table -> (String) table.get("tableName"))
                    .filter(tableName -> {
                        // 检查表名是否包含查询中的关键字
                        String normalizedTableName = tableName.toLowerCase();
                        return query.contains(normalizedTableName) || 
                               TABLE_NAME_MAPPINGS.entrySet().stream()
                                   .anyMatch(entry -> query.contains(entry.getKey()) && entry.getValue().equals(tableName));
                    })
                    .findFirst()
                    .orElse("organizations");
            
            // 从数据库元数据中获取表的重要列，减少硬编码
            List<String> columns = getImportantColumnsForTable(bestMatchTable);
            
            // 生成SQL查询，使用获取到的重要列而不是*，减少不必要的数据传输
            String columnList = columns.isEmpty() ? "*" : String.join(", ", columns);
            String sql = String.format("SELECT %s FROM %s", columnList, bestMatchTable);
            
            // 添加默认排序
            sql += String.format(" ORDER BY %s DESC", getDefaultOrderColumn(bestMatchTable));
            
            // 添加分页
            sql += " LIMIT 10";
            
            return sql;
        } catch (Exception e) {
            // 如果元数据生成失败，返回null，让调用者处理
            return null;
        }
    }
    
    /**
     * 使用LLM大模型生成SQL查询
     */
    private String generateSqlFromOllama(String query) {
        // 获取数据库结构描述
        String databaseStructure = getDatabaseStructure();
        
        // 添加重试机制
        String generatedSql = null;
        int maxRetries = 3;
        int retryCount = 0;
        
        // 添加重试机制
        while (retryCount < maxRetries) {
            try {
                // 使用LlmService生成SQL，默认使用Ollama
                generatedSql = llmService.generateSql(query, databaseStructure);
                
                // 清理生成的SQL
                String cleanedSql = llmService.cleanGeneratedSql(generatedSql);
                
                // 检查生成的SQL是否安全
                if (llmService.isSqlSafe(cleanedSql)) {
                    return cleanedSql;
                } else {
                    // 如果生成的SQL不安全，返回一个安全的默认查询
                    return "SELECT id, org_name, org_code, is_active FROM organizations WHERE is_active = 1 LIMIT 10";
                }
            } catch (Exception e) {
                retryCount++;
                System.err.println("LLM调用失败，正在重试... (" + retryCount + "/" + maxRetries + ")");
                System.err.println("错误信息: " + e.getMessage());
                
                // 如果是最后一次重试，返回默认查询
                if (retryCount >= maxRetries) {
                    System.err.println("LLM调用多次失败，返回默认查询");
                    return "SELECT id, org_name, org_code, is_active FROM organizations WHERE is_active = 1 LIMIT 10";
                }
                
                // 等待一段时间后重试
                try {
                    Thread.sleep(1000 * retryCount); // 指数退避
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        
        return generatedSql;
    }
    
    /**
     * 获取表的重要列
     */
    private List<String> getImportantColumnsForTable(String tableName) {
        Map<String, List<String>> importantColumns = new HashMap<>();
        
        // 定义各表的重要列，这些信息可以考虑从数据库元数据或配置文件中获取
        importantColumns.put("organizations", Arrays.asList("id", "org_name", "org_code", "parent_id", "is_active"));
        importantColumns.put("hrbp_leave_record", Arrays.asList("id", "emp_id", "start_time", "end_time", "leave_type"));
        importantColumns.put("overtime_records", Arrays.asList("id", "emp_id", "work_date", "actual_hours", "regular_hours", "overtime_hours"));
        importantColumns.put("exceptional_hours_records", Arrays.asList("id", "emp_id", "org_id", "indicator_name", "actual_value", "threshold", "status"));
        importantColumns.put("hrbp_gate_record", Arrays.asList("id", "emp_id", "org_id", "device_id", "event_time", "event_type"));
        importantColumns.put("consecutive_work_days", Arrays.asList("id", "emp_id", "org_id", "work_date", "consecutive_days"));
        
        return importantColumns.getOrDefault(tableName, new ArrayList<>());
    }
    
    /**
     * 获取表的默认排序字段，利用表结构知识减少硬编码
     */
    private String getDefaultOrderColumn(String tableName) {
        Map<String, String> defaultOrderColumns = new HashMap<>();
        defaultOrderColumns.put("organizations", "org_name");
        defaultOrderColumns.put("hrbp_leave_record", "start_time");
        defaultOrderColumns.put("overtime_records", "work_date");
        defaultOrderColumns.put("exceptional_hours_records", "created_at");
        defaultOrderColumns.put("hrbp_gate_record", "event_time");
        defaultOrderColumns.put("hrbp_schedule_shift", "shift_date");
        defaultOrderColumns.put("hrbp_trip_record", "start_date");
        defaultOrderColumns.put("consecutive_work_days", "work_date");
        
        return defaultOrderColumns.getOrDefault(tableName, "id");
    }
    
    /**
     * 获取数据库结构描述，用于大模型理解数据库结构
     */
    public String getDatabaseStructure() {
        return databaseMetadataService.getDatabaseStructureDescription() + "\n" + 
               databaseMetadataService.getTableRelationships();
    }
    
    /**
     * 从字符串中提取数字
     */
    private int extractNumber(String text) {
        // 简单实现，提取第一个数字
        for (int i = 0; i < text.length(); i++) {
            if (Character.isDigit(text.charAt(i))) {
                int j = i + 1;
                while (j < text.length() && Character.isDigit(text.charAt(j))) {
                    j++;
                }
                try {
                    return Integer.parseInt(text.substring(i, j));
                } catch (NumberFormatException e) {
                    return 10;
                }
            }
        }
        return 10;
    }
}