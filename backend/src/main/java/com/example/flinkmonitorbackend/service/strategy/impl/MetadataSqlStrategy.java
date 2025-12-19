package com.example.flinkmonitorbackend.service.strategy.impl;

import com.example.flinkmonitorbackend.service.DatabaseMetadataService;
import com.example.flinkmonitorbackend.service.strategy.AbstractSqlGenerationStrategy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 元数据SQL策略
 * 基于数据库元数据生成SQL查询
 */
@Component
public class MetadataSqlStrategy extends AbstractSqlGenerationStrategy {
    
    // 表名映射关系
    private static final Map<String, String> TABLE_NAME_MAPPINGS = new HashMap<>();
    
    // 表的默认排序字段
    private static final Map<String, String> DEFAULT_ORDER_COLUMNS = new HashMap<>();
    
    @Autowired
    private DatabaseMetadataService databaseMetadataService;
    
    static {
        // 初始化表名映射
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
        
        // 初始化表的默认排序字段
        DEFAULT_ORDER_COLUMNS.put("organizations", "org_name");
        DEFAULT_ORDER_COLUMNS.put("hrbp_leave_record", "start_time");
        DEFAULT_ORDER_COLUMNS.put("overtime_records", "work_date");
        DEFAULT_ORDER_COLUMNS.put("exceptional_hours_records", "created_at");
        DEFAULT_ORDER_COLUMNS.put("hrbp_gate_record", "event_time");
        DEFAULT_ORDER_COLUMNS.put("hrbp_schedule_shift", "shift_date");
        DEFAULT_ORDER_COLUMNS.put("hrbp_trip_record", "start_date");
        DEFAULT_ORDER_COLUMNS.put("consecutive_work_days", "work_date");
    }
    
    @Override
    public String generateSql(String naturalLanguageQuery) {
        try {
            // 获取所有表信息
            List<Map<String, Object>> tables = databaseMetadataService.getAllTables();
            
            // 尝试匹配最相关的表
            String bestMatchTable = findBestMatchTable(tables, naturalLanguageQuery);
            
            // 从数据库元数据中获取表的重要列
            List<String> columns = getImportantColumnsForTable(bestMatchTable);
            
            // 生成SQL查询
            String columnList = columns.isEmpty() ? "*" : String.join(", ", columns);
            String sql = String.format("SELECT %s FROM %s", columnList, bestMatchTable);
            
            // 添加默认排序
            String orderColumn = DEFAULT_ORDER_COLUMNS.getOrDefault(bestMatchTable, "id");
            sql += String.format(" ORDER BY %s DESC", orderColumn);
            
            // 添加分页
            sql += " LIMIT 10";
            
            return sql;
        } catch (Exception e) {
            // 如果元数据生成失败，返回null
            return null;
        }
    }
    
    @Override
    public String getStrategyName() {
        return "Metadata Strategy";
    }
    
    @Override
    public boolean isApplicable(String naturalLanguageQuery) {
        // 元数据策略适用于所有查询，作为兜底策略
        return true;
    }
    
    /**
     * 查找最匹配的表
     */
    private String findBestMatchTable(List<Map<String, Object>> tables, String naturalLanguageQuery) {
        String normalizedQuery = naturalLanguageQuery.toLowerCase();
        
        // 尝试找到完全匹配的表名
        return tables.stream()
                .map(table -> (String) table.get("tableName"))
                .filter(tableName -> {
                    // 检查表名是否包含查询中的关键字
                    String normalizedTableName = tableName.toLowerCase();
                    return normalizedQuery.contains(normalizedTableName) || 
                           TABLE_NAME_MAPPINGS.entrySet().stream()
                               .anyMatch(entry -> normalizedQuery.contains(entry.getKey()) && entry.getValue().equals(tableName));
                })
                .findFirst()
                .orElse("organizations"); // 默认返回organizations表
    }
    
    /**
     * 获取表的重要列
     */
    private List<String> getImportantColumnsForTable(String tableName) {
        List<String> columns = new ArrayList<>();
        
        try {
            // 从数据库元数据中获取表结构
            Map<String, Object> tableStructure = databaseMetadataService.getTableStructure(tableName);
            
            // 从表结构中提取重要列
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> columnsMetadata = (List<Map<String, Object>>) tableStructure.get("columns");
            
            // 只选择前5个列作为重要列
            if (columnsMetadata != null) {
                for (int i = 0; i < Math.min(5, columnsMetadata.size()); i++) {
                    Map<String, Object> columnMetadata = columnsMetadata.get(i);
                    columns.add((String) columnMetadata.get("columnName"));
                }
            }
        } catch (Exception e) {
            // 如果获取表结构失败，返回默认列
            return getDefaultColumnsForTable(tableName);
        }
        
        return columns;
    }
    
    /**
     * 获取表的默认列
     */
    private List<String> getDefaultColumnsForTable(String tableName) {
        Map<String, List<String>> defaultColumns = new HashMap<>();
        
        defaultColumns.put("organizations", List.of("id", "org_name", "org_code", "parent_id", "is_active"));
        defaultColumns.put("hrbp_leave_record", List.of("id", "emp_id", "start_time", "end_time", "leave_type"));
        defaultColumns.put("overtime_records", List.of("id", "emp_id", "work_date", "actual_hours", "overtime_hours"));
        defaultColumns.put("exceptional_hours_records", List.of("id", "emp_id", "org_id", "indicator_name", "actual_value"));
        
        return defaultColumns.getOrDefault(tableName, new ArrayList<>());
    }
}