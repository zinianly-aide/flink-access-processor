package com.example.flinkmonitorbackend.service.strategy.impl;

import com.example.flinkmonitorbackend.service.strategy.AbstractSqlGenerationStrategy;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * 模板SQL策略
 * 基于预定义模板生成SQL查询
 */
@Component
public class TemplateSqlStrategy extends AbstractSqlGenerationStrategy {
    
    // 预定义的查询模板映射
    private static final Map<String, String> SQL_TEMPLATES = new HashMap<>();
    
    static {
        // 初始化查询模板
        SQL_TEMPLATES.put("查询所有部门的总请假小时数排行", 
                "SELECT o.org_name, o.org_code, SUM(l.leave_hours) AS total_leave_hours " +
                "FROM hrbp_leave_record l JOIN organizations o ON l.org_id = o.id " +
                "GROUP BY o.id, o.org_name, o.org_code ORDER BY total_leave_hours DESC");

        SQL_TEMPLATES.put("计算各部门的净加班小时数", 
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

        SQL_TEMPLATES.put("查询状态为待处理的异常工时记录数量", 
                "SELECT COUNT(*) AS pending_exceptional_records " +
                "FROM exceptional_hours_records WHERE status = 'pending'");

        SQL_TEMPLATES.put("找出连续工作天数最多的前5名员工", 
                "SELECT emp_id, MAX(consecutive_days) AS max_consecutive_days " +
                "FROM consecutive_work_days " +
                "GROUP BY emp_id ORDER BY max_consecutive_days DESC LIMIT 5");
    }
    
    @Override
    public String generateSql(String naturalLanguageQuery) {
        String normalizedQuery = normalizeQuery(naturalLanguageQuery);
        
        // 检查是否匹配任何模板
        for (Map.Entry<String, String> entry : SQL_TEMPLATES.entrySet()) {
            String templateKey = entry.getKey().toLowerCase();
            if (normalizedQuery.contains(templateKey)) {
                return entry.getValue();
            }
        }
        
        return null;
    }
    
    @Override
    public String getStrategyName() {
        return "Template Strategy";
    }
    
    @Override
    public boolean isApplicable(String naturalLanguageQuery) {
        String normalizedQuery = normalizeQuery(naturalLanguageQuery);
        
        // 检查是否包含任何模板关键词
        for (String templateKey : SQL_TEMPLATES.keySet()) {
            if (normalizedQuery.contains(templateKey.toLowerCase())) {
                return true;
            }
        }
        
        return false;
    }
}