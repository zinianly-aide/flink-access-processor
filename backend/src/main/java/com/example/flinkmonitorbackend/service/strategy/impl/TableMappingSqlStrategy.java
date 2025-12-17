package com.example.flinkmonitorbackend.service.strategy.impl;

import com.example.flinkmonitorbackend.service.DatabaseMetadataService;
import com.example.flinkmonitorbackend.service.strategy.AbstractSqlGenerationStrategy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 表映射SQL策略
 * 基于表名映射生成SQL查询
 */
@Component
public class TableMappingSqlStrategy extends AbstractSqlGenerationStrategy {
    
    // 表名映射关系
    private static final Map<String, String> TABLE_NAME_MAPPINGS = new HashMap<>();
    
    // 各表的重要列
    private static final Map<String, List<String>> IMPORTANT_COLUMNS = new HashMap<>();
    
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
        
        // 初始化各表的重要列
        IMPORTANT_COLUMNS.put("organizations", Arrays.asList("id", "org_name", "org_code", "parent_id", "is_active"));
        IMPORTANT_COLUMNS.put("hrbp_leave_record", Arrays.asList("id", "emp_id", "start_time", "end_time", "leave_type"));
        IMPORTANT_COLUMNS.put("overtime_records", Arrays.asList("id", "emp_id", "work_date", "actual_hours", "regular_hours", "overtime_hours"));
        IMPORTANT_COLUMNS.put("exceptional_hours_records", Arrays.asList("id", "emp_id", "org_id", "indicator_name", "actual_value", "threshold", "status"));
        IMPORTANT_COLUMNS.put("hrbp_gate_record", Arrays.asList("id", "emp_id", "org_id", "device_id", "event_time", "event_type"));
        IMPORTANT_COLUMNS.put("consecutive_work_days", Arrays.asList("id", "emp_id", "org_id", "work_date", "consecutive_days"));
        
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
        String normalizedQuery = normalizeQuery(naturalLanguageQuery);
        
        // 查找匹配的表名
        String actualTableName = findMatchingTable(normalizedQuery);
        if (actualTableName == null) {
            return null;
        }
        
        // 获取表的重要列
        List<String> columns = getImportantColumnsForTable(actualTableName);
        
        // 生成SQL查询
        String columnList = columns.isEmpty() ? "*" : String.join(", ", columns);
        StringBuilder sql = new StringBuilder(String.format("SELECT %s FROM %s", columnList, actualTableName));
        
        // 添加过滤条件
        addFilterConditions(sql, normalizedQuery, actualTableName);
        
        // 添加排序
        addOrderByClause(sql, normalizedQuery, actualTableName);
        
        // 添加分页
        sql.append(" LIMIT 10");
        
        return sql.toString();
    }
    
    @Override
    public String getStrategyName() {
        return "Table Mapping Strategy";
    }
    
    @Override
    public boolean isApplicable(String naturalLanguageQuery) {
        String normalizedQuery = normalizeQuery(naturalLanguageQuery);
        
        // 检查是否包含已知的表名映射
        return TABLE_NAME_MAPPINGS.entrySet().stream()
                .anyMatch(entry -> normalizedQuery.contains(entry.getKey()));
    }
    
    /**
     * 查找匹配的表名
     */
    private String findMatchingTable(String normalizedQuery) {
        return TABLE_NAME_MAPPINGS.entrySet().stream()
                .filter(entry -> normalizedQuery.contains(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }
    
    /**
     * 获取表的重要列
     */
    private List<String> getImportantColumnsForTable(String tableName) {
        return IMPORTANT_COLUMNS.getOrDefault(tableName, new ArrayList<>());
    }
    
    /**
     * 添加过滤条件
     */
    private void addFilterConditions(StringBuilder sql, String normalizedQuery, String tableName) {
        boolean hasWhere = false;
        
        // 添加状态过滤条件
        if (normalizedQuery.contains("状态") || normalizedQuery.contains("status")) {
            sql.append(" WHERE");
            hasWhere = true;
            
            if (normalizedQuery.contains("待处理") || normalizedQuery.contains("pending")) {
                sql.append(" status = 'pending'");
            } else if (normalizedQuery.contains("已处理") || normalizedQuery.contains("processed")) {
                sql.append(" status = 'processed'");
            } else if (normalizedQuery.contains("已批准") || normalizedQuery.contains("approved")) {
                sql.append(" status = 'approved'");
            }
        }
    }
    
    /**
     * 添加排序子句
     */
    private void addOrderByClause(StringBuilder sql, String normalizedQuery, String tableName) {
        String orderColumn = DEFAULT_ORDER_COLUMNS.getOrDefault(tableName, "id");
        sql.append(String.format(" ORDER BY %s DESC", orderColumn));
    }
}