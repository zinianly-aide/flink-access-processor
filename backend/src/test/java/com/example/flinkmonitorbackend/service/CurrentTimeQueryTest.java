package com.example.flinkmonitorbackend.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CurrentTimeQueryTest {

    @Autowired
    private NaturalLanguageQueryService naturalLanguageQueryService;

    @Autowired
    private OllamaService ollamaService;

    @Test
    void testCurrentTimeQuery() {
        // Test direct Ollama generation for current time
        String query = "当前时间";
        String databaseStructure = "数据库包含表：organizations (id, org_name, org_code, parent_id, is_active)";
        
        System.out.println("Testing direct Ollama generation for: " + query);
        String rawSql = ollamaService.generateSql(query, databaseStructure);
        System.out.println("Raw SQL from Ollama: " + rawSql);
        
        String cleanedSql = ollamaService.cleanGeneratedSql(rawSql);
        System.out.println("Cleaned SQL: " + cleanedSql);
        
        boolean isSafe = ollamaService.isSqlSafe(cleanedSql);
        System.out.println("Is SQL safe: " + isSafe);
        
        // Test full translation pipeline
        System.out.println("\nTesting full translation pipeline:");
        String finalSql = naturalLanguageQueryService.translateToSql(query);
        System.out.println("Final SQL: " + finalSql);
    }

    @Test
    void testOtherSimpleQueries() {
        String[] queries = {
            "查询当前日期",
            "显示当前时间",
            "获取系统时间",
            "查询当前时间和日期"
        };
        
        for (String query : queries) {
            System.out.println("\nQuery: " + query);
            String sql = naturalLanguageQueryService.translateToSql(query);
            System.out.println("Generated SQL: " + sql);
        }
    }
}
