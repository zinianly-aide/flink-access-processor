package com.example.flinkmonitorbackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class NaturalLanguageQueryServiceImplTest {

    @Autowired
    private NaturalLanguageQueryService naturalLanguageQueryService;

    @Test
    void testTranslateToSql() {
        // 测试用例1：模板匹配查询 - 净加班查询
        String query1 = "计算各部门的净加班小时数";
        String sql1 = naturalLanguageQueryService.translateToSql(query1);
        assertNotNull(sql1);
        assertTrue(sql1.toUpperCase().contains("SELECT"));
        assertTrue(sql1.contains("net_overtime_hours"));
        assertTrue(sql1.contains("ORDER BY"));

        // 测试用例2：模板匹配查询 - 请假排行
        String query2 = "查询所有部门的总请假小时数排行";
        String sql2 = naturalLanguageQueryService.translateToSql(query2);
        assertNotNull(sql2);
        assertTrue(sql2.toUpperCase().contains("SELECT"));
        assertTrue(sql2.contains("total_leave_hours"));
        assertTrue(sql2.contains("ORDER BY"));

        // 测试用例3：简单查询 - 部门信息
        String query3 = "查询部门名称";
        String sql3 = naturalLanguageQueryService.translateToSql(query3);
        assertNotNull(sql3);
        assertTrue(sql3.toUpperCase().contains("SELECT"));
        assertTrue(sql3.contains("organizations"));
    }

    @Test
    void testExecuteNaturalLanguageQuery() {
        // 测试用例1：查询部门信息
        String query1 = "查询所有部门";
        List<Map<String, Object>> results1 = naturalLanguageQueryService.executeNaturalLanguageQuery(query1);
        assertNotNull(results1);
        assertTrue(results1.size() >= 0);

        // 测试用例2：查询状态为待处理的异常工时记录
        String query2 = "查询状态为待处理的异常工时记录";
        List<Map<String, Object>> results2 = naturalLanguageQueryService.executeNaturalLanguageQuery(query2);
        assertNotNull(results2);
        assertTrue(results2.size() >= 0);
    }

    @Test
    void testOllamaIntegration() {
        // 测试用例1：使用Ollama生成SQL - 这个测试依赖于Ollama服务，可能会有不同的结果
        String query = "查询所有部门的详细信息";
        String sql = naturalLanguageQueryService.translateToSql(query);
        assertNotNull(sql);
        assertTrue(sql.toUpperCase().contains("SELECT"));
        assertTrue(sql.contains("organizations"));
    }
}
