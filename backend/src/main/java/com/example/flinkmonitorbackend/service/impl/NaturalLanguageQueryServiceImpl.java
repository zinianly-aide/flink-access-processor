package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.service.NaturalLanguageQueryService;
import com.example.flinkmonitorbackend.utils.SqlExecutor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
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
     * 将自然语言转换为SQL查询语句（不执行）
     * 支持的查询模式：
     * 1. 查询所有部门的总请假小时数排行
     * 2. 计算各部门的净加班小时数
     * 3. 查询状态为待处理的异常工时记录数量
     * 4. 找出连续工作天数最多的前5名员工
     */
    @Override
    public String translateToSql(String naturalLanguageQuery) {
        String normalizedQuery = naturalLanguageQuery.toLowerCase().trim();
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

        // 支持一些简单的正则表达式匹配
        // 匹配 "查询[组织/部门]的[指标]" 模式
        Pattern deptPattern = Pattern.compile("查询(.+)的(.+)");
        Matcher deptMatcher = deptPattern.matcher(normalizedQuery);
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
        }

        // 如果没有匹配到任何模板，返回一个示例查询
        return "SELECT * FROM organizations WHERE is_active = 1 LIMIT 10";
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
