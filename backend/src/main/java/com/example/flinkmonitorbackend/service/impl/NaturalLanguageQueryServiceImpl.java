package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.service.DatabaseMetadataService;
import com.example.flinkmonitorbackend.service.NaturalLanguageQueryService;
import com.example.flinkmonitorbackend.service.LlmService;
import com.example.flinkmonitorbackend.utils.SqlExecutor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 自然语言查询服务实现类
 */
@Service
public class NaturalLanguageQueryServiceImpl implements NaturalLanguageQueryService {

    @Autowired
    private SqlExecutor sqlExecutor;
    
    @Autowired
    private DatabaseMetadataService databaseMetadataService;
    
    @Autowired
    private LlmService llmService;

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
        // 将自然语言转换为SQL
        String sql = translateToSql(naturalLanguageQuery);
        // 执行SQL查询
        try {
            return sqlExecutor.executeQuery(sql);
        } catch (SQLException e) {
            throw new RuntimeException("SQL查询执行失败: " + e.getMessage(), e);
        }
    }
    
    /**
     * 执行自然语言查询并返回包含评估结果的数据
     */
    @Override
    public Map<String, Object> executeNaturalLanguageQueryWithEvaluation(String naturalLanguageQuery) {
        // 将自然语言转换为SQL
        String sql = translateToSql(naturalLanguageQuery);
        // 执行SQL查询
        List<Map<String, Object>> results;
        try {
            results = sqlExecutor.executeQuery(sql);
        } catch (SQLException e) {
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
        return result;
    }
    
    /**
     * 执行指定的SQL查询并返回包含评估结果的数据
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
     * 将自然语言转换为SQL查询语句并生成评估结果（不执行）
     */
    @Override
    public Map<String, Object> translateToSqlWithEvaluation(String naturalLanguageQuery) {
        // 将自然语言转换为SQL
        String sql = translateToSql(naturalLanguageQuery);
        
        // 生成SQL评估结果（模拟查询结果进行评估）
        // 由于SQL未执行，我们使用空结果或模拟数据进行评估
        List<Map<String, Object>> mockResults = new ArrayList<>();
        
        // 评估SQL
        String evaluation = llmService.evaluateSqlResults(naturalLanguageQuery, sql, mockResults);
        
        // 返回包含SQL和评估的数据
        Map<String, Object> result = new HashMap<>();
        result.put("query", naturalLanguageQuery);
        result.put("sql", sql);
        result.put("evaluation", evaluation);
        return result;
    }

    /**
     * 将自然语言转换为SQL查询语句（不执行）
     * 主要使用Ollama大模型生成SQL，只在必要时进行安全检查
     */
    @Override
    public String translateToSql(String naturalLanguageQuery) {
        String normalizedQuery = naturalLanguageQuery.toLowerCase().trim();
        
        // 直接使用Ollama大模型生成SQL，作为主要生成方式
        String generatedSql = generateSqlFromOllama(normalizedQuery);
        
        // 检查生成的SQL是否安全
        if (llmService.isSqlSafe(generatedSql)) {
            return generatedSql;
        } else {
            // 如果生成的SQL不安全，返回一个安全的默认查询
            return "SELECT id, org_name, org_code, is_active FROM organizations WHERE is_active = 1 LIMIT 10";
        }
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
                "LEFT JOIN (SELECT org_id, SUM(overtime_hours) AS overtime_hours FROM overtime_records GROUP BY org_id) ot ON o.id = ot.org_id " +
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
        // 检查是否包含已知的表名
        for (Map.Entry<String, String> mapping : TABLE_NAME_MAPPINGS.entrySet()) {
            if (query.contains(mapping.getKey())) {
                String actualTableName = mapping.getValue();
                String sql = "SELECT * FROM " + actualTableName;
                
                // 添加简单的过滤条件
                if (query.contains("状态") || query.contains("status")) {
                    if (query.contains("待处理") || query.contains("pending")) {
                        sql += " WHERE status = 'pending'";
                    }
                    if (query.contains("已处理") || query.contains("processed")) {
                        sql += " WHERE status = 'processed'";
                    }
                    if (query.contains("已批准") || query.contains("approved")) {
                        sql += " WHERE status = 'approved'";
                    }
                }
                
                // 添加排序
                if (query.contains("排行") || query.contains("排名") || query.contains("order")) {
                    if (actualTableName.equals("organizations")) {
                        sql += " ORDER BY org_name ASC";
                    } else if (actualTableName.equals("hrbp_leave_record")) {
                        sql += " ORDER BY start_time DESC";
                    } else if (actualTableName.equals("overtime_records")) {
                        sql += " ORDER BY work_date DESC";
                    }
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
        Pattern deptPattern = Pattern.compile("查询(.+)的(.+)");
        Matcher deptMatcher = deptPattern.matcher(query);
        if (deptMatcher.find()) {
            String dept = deptMatcher.group(1);
            String metric = deptMatcher.group(2);
            
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
                        "FROM overtime_records ot JOIN organizations o ON ot.org_id = o.id " +
                        "GROUP BY o.id, o.org_name, o.org_code ORDER BY total_overtime_hours DESC" +
                        (dept.contains("前") ? " LIMIT " + extractNumber(dept) : "")
                );
            }
        }

        // 匹配 "查询[表名]" 模式
        Pattern tablePattern = Pattern.compile("查询(.+)");
        Matcher tableMatcher = tablePattern.matcher(query);
        if (tableMatcher.find()) {
            String tableDesc = tableMatcher.group(1);
            for (Map.Entry<String, String> mapping : TABLE_NAME_MAPPINGS.entrySet()) {
                if (tableDesc.contains(mapping.getKey())) {
                    return String.format("SELECT * FROM %s LIMIT 10", mapping.getValue());
                }
            }
        }
        
        return null;
    }
    
    /**
     * 使用LLM大模型生成SQL查询
     */
    private String generateSqlFromOllama(String query) {
        // 获取数据库结构描述
        String databaseStructure = getDatabaseStructure();
        
        // 使用LlmService生成SQL，默认使用Ollama
        String generatedSql = llmService.generateSql(query, databaseStructure);
        
        // 清理生成的SQL
        String cleanedSql = llmService.cleanGeneratedSql(generatedSql);
        
        // 检查生成的SQL是否安全
        if (llmService.isSqlSafe(cleanedSql)) {
            return cleanedSql;
        } else {
            // 如果生成的SQL不安全，返回一个安全的默认查询
            return "SELECT id, org_name, org_code, is_active FROM organizations WHERE is_active = 1 LIMIT 10";
        }
    }
    
    /**
     * 利用数据库元数据生成SQL查询
     */
    private String generateSqlFromMetadata(String query) {
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
        
        // 生成简单的SELECT查询
        String sql = String.format("SELECT * FROM %s LIMIT 10", bestMatchTable);
        
        // 根据表名添加额外的优化
        if (bestMatchTable.equals("exceptional_hours_records")) {
            sql = "SELECT emp_id, org_id, indicator_name, actual_value, threshold, status, period_start, period_end " +
                  "FROM exceptional_hours_records " +
                  "ORDER BY created_at DESC LIMIT 10";
        } else if (bestMatchTable.equals("overtime_records")) {
            sql = "SELECT emp_id, work_date, actual_hours, regular_hours, overtime_hours " +
                  "FROM overtime_records " +
                  "ORDER BY work_date DESC LIMIT 10";
        } else if (bestMatchTable.equals("hrbp_leave_record")) {
            sql = "SELECT emp_id, start_time, end_time, leave_type " +
                  "FROM hrbp_leave_record " +
                  "ORDER BY start_time DESC LIMIT 10";
        } else if (bestMatchTable.equals("organizations")) {
            sql = "SELECT id, org_name, org_code, parent_id, is_active " +
                  "FROM organizations " +
                  "ORDER BY org_name ASC LIMIT 10";
        }
        
        return sql;
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
        Pattern numPattern = Pattern.compile("\\d+");
        Matcher numMatcher = numPattern.matcher(text);
        if (numMatcher.find()) {
            return Integer.parseInt(numMatcher.group());
        }
        return 10;
    }
}
