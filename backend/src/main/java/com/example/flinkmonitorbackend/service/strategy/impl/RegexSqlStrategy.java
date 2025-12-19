package com.example.flinkmonitorbackend.service.strategy.impl;

import com.example.flinkmonitorbackend.service.strategy.AbstractSqlGenerationStrategy;
import org.springframework.stereotype.Component;

/**
 * 正则SQL策略
 * 基于正则表达式生成SQL查询
 */
@Component
public class RegexSqlStrategy extends AbstractSqlGenerationStrategy {
    
    @Override
    public String generateSql(String naturalLanguageQuery) {
        String normalizedQuery = normalizeQuery(naturalLanguageQuery);
        
        // 匹配 "查询[组织/部门]的[指标]" 模式
        if (normalizedQuery.contains("查询") && normalizedQuery.contains("的")) {
            int startIndex = normalizedQuery.indexOf("查询") + 2;
            int endIndex = normalizedQuery.indexOf("的", startIndex);
            if (endIndex > startIndex) {
                String dept = normalizedQuery.substring(startIndex, endIndex).trim();
                String metric = normalizedQuery.substring(endIndex + 1).trim();
                
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
        if (normalizedQuery.contains("查询")) {
            String tableDesc = normalizedQuery.substring(2).trim();
            return String.format("SELECT * FROM %s LIMIT 10", tableDesc);
        }
        
        return null;
    }
    
    @Override
    public String getStrategyName() {
        return "Regex Strategy";
    }
    
    @Override
    public boolean isApplicable(String naturalLanguageQuery) {
        String normalizedQuery = normalizeQuery(naturalLanguageQuery);
        
        // 检查是否符合正则匹配模式
        return normalizedQuery.contains("查询") && 
               (normalizedQuery.contains("的") || 
                normalizedQuery.length() < 20);
    }
    
    /**
     * 从字符串中提取数字
     */
    private int extractNumber(String text) {
        StringBuilder numberBuilder = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (Character.isDigit(c)) {
                numberBuilder.append(c);
            }
        }
        if (numberBuilder.length() > 0) {
            try {
                return Integer.parseInt(numberBuilder.toString());
            } catch (NumberFormatException e) {
                return 10;
            }
        }
        return 10;
    }
}