package com.example.flinkmonitorbackend.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class SimpleSqlGenerationTest {

    @Autowired
    private NaturalLanguageQueryService naturalLanguageQueryService;

    @Test
    void testSqlGeneration() {
        // 测试简单查询
        String query1 = "查询部门名称";
        String sql1 = naturalLanguageQueryService.translateToSql(query1);
        System.out.println("Query: " + query1);
        System.out.println("Generated SQL: " + sql1);
        System.out.println();

        // 测试Ollama生成
        String query2 = "查询所有部门的名称和代码";
        String sql2 = naturalLanguageQueryService.translateToSql(query2);
        System.out.println("Query: " + query2);
        System.out.println("Generated SQL: " + sql2);
        System.out.println();

        // 测试净加班查询
        String query3 = "计算各部门的净加班小时数";
        String sql3 = naturalLanguageQueryService.translateToSql(query3);
        System.out.println("Query: " + query3);
        System.out.println("Generated SQL: " + sql3);
        System.out.println();
    }
}
