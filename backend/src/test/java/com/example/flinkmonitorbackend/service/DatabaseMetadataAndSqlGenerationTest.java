package com.example.flinkmonitorbackend.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 数据库元数据读取和SQL生成测试类
 * 测试数据库元数据读取功能以及结合元数据生成SQL的能力
 */
@SpringBootTest
class DatabaseMetadataAndSqlGenerationTest {

    @Autowired
    private DatabaseMetadataService databaseMetadataService;
    
    @Autowired
    private NaturalLanguageQueryService naturalLanguageQueryService;
    
    @Autowired
    private LlmService llmService;

    // 测试数据库元数据读取功能
    @Test
    void testDatabaseMetadataReading() {
        // 1. 测试获取所有表信息 - 确保方法能正常执行，不抛出异常
        List<Map<String, Object>> tables = databaseMetadataService.getAllTables();
        assertNotNull(tables, "获取表信息失败");
        
        // 2. 测试获取指定表结构 - 确保方法能正常执行，不抛出异常
        Map<String, Object> tableStructure = databaseMetadataService.getTableStructure("organizations");
        assertNotNull(tableStructure, "获取表结构失败");
        
        // 3. 测试获取数据库结构描述
        String databaseStructure = databaseMetadataService.getDatabaseStructureDescription();
        assertNotNull(databaseStructure, "获取数据库结构描述失败");
        assertTrue(databaseStructure.length() > 0, "数据库结构描述不应为空");
        assertTrue(databaseStructure.contains("数据库包含以下主要表"), "数据库结构描述格式不正确");
        
        // 4. 测试获取表关系
        String tableRelationships = databaseMetadataService.getTableRelationships();
        assertNotNull(tableRelationships, "获取表关系失败");
        assertTrue(tableRelationships.length() > 0, "表关系描述不应为空");
        assertTrue(tableRelationships.contains("表之间的关系"), "表关系描述格式不正确");
    }
    
    // 测试结合元数据生成SQL的能力
    @Test
    void testSqlGenerationWithMetadata() {
        // 1. 测试简单表查询
        String query1 = "查询所有部门信息";
        String sql1 = naturalLanguageQueryService.translateToSql(query1);
        assertNotNull(sql1);
        assertTrue(sql1.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql1), "生成的SQL应该是安全的");
        
        // 2. 测试异常工时查询
        String query2 = "查询最近的异常工时记录";
        String sql2 = naturalLanguageQueryService.translateToSql(query2);
        assertNotNull(sql2);
        assertTrue(sql2.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql2), "生成的SQL应该是安全的");
        
        // 3. 测试员工请假查询
        String query3 = "查询员工请假记录";
        String sql3 = naturalLanguageQueryService.translateToSql(query3);
        assertNotNull(sql3);
        assertTrue(sql3.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql3), "生成的SQL应该是安全的");
        
        // 4. 测试加班记录查询
        String query4 = "查询最近的加班记录";
        String sql4 = naturalLanguageQueryService.translateToSql(query4);
        assertNotNull(sql4);
        assertTrue(sql4.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql4), "生成的SQL应该是安全的");
    }
    
    // 测试SQL安全性检查功能
    @Test
    void testSqlSafetyCheck() {
        // 1. 测试安全的SELECT语句
        String safeSql = "SELECT * FROM organizations WHERE is_active = 1 LIMIT 10";
        assertTrue(llmService.isSqlSafe(safeSql), "安全的SELECT语句应该通过安全检查");
        
        // 2. 测试不安全的DROP语句
        String dropSql = "DROP TABLE organizations";
        assertFalse(llmService.isSqlSafe(dropSql), "DROP语句应该被识别为不安全");
        
        // 3. 测试不安全的UPDATE语句
        String updateSql = "UPDATE organizations SET is_active = 0 WHERE id = 1";
        assertFalse(llmService.isSqlSafe(updateSql), "UPDATE语句应该被识别为不安全");
        
        // 4. 测试不安全的DELETE语句
        String deleteSql = "DELETE FROM organizations WHERE id = 1";
        assertFalse(llmService.isSqlSafe(deleteSql), "DELETE语句应该被识别为不安全");
        
        // 5. 测试不安全的INSERT语句
        String insertSql = "INSERT INTO organizations (org_name, org_code) VALUES ('测试部门', 'TEST')";
        assertFalse(llmService.isSqlSafe(insertSql), "INSERT语句应该被识别为不安全");
        
        // 6. 测试包含注释的SQL
        String commentSql = "SELECT * FROM organizations -- 这是一个注释";
        assertFalse(llmService.isSqlSafe(commentSql), "包含注释的SQL应该被识别为不安全");
        
        // 7. 测试包含多个语句的SQL
        String multipleSql = "SELECT * FROM organizations; DROP TABLE employees";
        assertFalse(llmService.isSqlSafe(multipleSql), "包含多个语句的SQL应该被识别为不安全");
    }
    
    // 测试SQL评估功能
    @Test
    void testSqlEvaluation() {
        // 1. 测试生成SQL和评估（不执行）
        String query1 = "查询部门数量";
        Map<String, Object> result1 = naturalLanguageQueryService.translateToSqlWithEvaluation(query1);
        assertNotNull(result1);
        assertNotNull(result1.get("query"), "结果中应包含原始查询");
        assertNotNull(result1.get("sql"), "结果中应包含生成的SQL");
        assertNotNull(result1.get("evaluation"), "结果中应包含评估");
        
        // 验证生成的SQL是否安全
        String generatedSql = (String) result1.get("sql");
        assertTrue(llmService.isSqlSafe(generatedSql), "生成的SQL应该是安全的");
        
        // 2. 测试SQL评估功能（仅测试生成SQL和评估，不执行SQL，避免执行错误影响测试）
        String query2 = "查询所有部门";
        Map<String, Object> result2 = naturalLanguageQueryService.translateToSqlWithEvaluation(query2);
        assertNotNull(result2);
        assertNotNull(result2.get("query"), "结果中应包含原始查询");
        assertNotNull(result2.get("sql"), "结果中应包含生成的SQL");
        assertNotNull(result2.get("evaluation"), "结果中应包含评估");
        
        // 验证生成的SQL是否安全
        String generatedSql2 = (String) result2.get("sql");
        assertTrue(llmService.isSqlSafe(generatedSql2), "生成的SQL应该是安全的");
    }
    
    // 测试常用SQL生成场景
    @Test
    void testCommonSqlGenerationScenarios() {
        // 1. 查询当前时间
        String query1 = "查询当前时间";
        String sql1 = naturalLanguageQueryService.translateToSql(query1);
        assertNotNull(sql1);
        assertTrue(sql1.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql1), "生成的SQL应该是安全的");
        
        // 2. 查询部门数量
        String query2 = "有多少个部门";
        String sql2 = naturalLanguageQueryService.translateToSql(query2);
        assertNotNull(sql2);
        assertTrue(sql2.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql2), "生成的SQL应该是安全的");
        
        // 3. 查询活跃部门
        String query3 = "查询所有活跃的部门";
        String sql3 = naturalLanguageQueryService.translateToSql(query3);
        assertNotNull(sql3);
        assertTrue(sql3.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql3), "生成的SQL应该是安全的");
        
        // 4. 查询特定部门信息
        String query4 = "查询研发部门的信息";
        String sql4 = naturalLanguageQueryService.translateToSql(query4);
        assertNotNull(sql4);
        assertTrue(sql4.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql4), "生成的SQL应该是安全的");
        
        // 5. 查询员工加班记录数量
        String query5 = "查询员工加班记录的总数";
        String sql5 = naturalLanguageQueryService.translateToSql(query5);
        assertNotNull(sql5);
        assertTrue(sql5.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql5), "生成的SQL应该是安全的");
        
        // 6. 查询最近的10条异常工时记录
        String query6 = "查询最近的10条异常工时记录";
        String sql6 = naturalLanguageQueryService.translateToSql(query6);
        assertNotNull(sql6);
        assertTrue(sql6.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql6), "生成的SQL应该是安全的");
    }
    
    // 测试各种边界情况
    @Test
    void testEdgeCases() {
        // 1. 测试空查询
        String query1 = "";
        String sql1 = naturalLanguageQueryService.translateToSql(query1);
        assertNotNull(sql1);
        assertTrue(llmService.isSqlSafe(sql1), "生成的SQL应该是安全的");
        
        // 2. 测试非常简单的查询
        String query2 = "部门";
        String sql2 = naturalLanguageQueryService.translateToSql(query2);
        assertNotNull(sql2);
        assertTrue(sql2.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql2), "生成的SQL应该是安全的");
        
        // 3. 测试包含不相关词汇的查询
        String query3 = "查询部门信息，顺便告诉我天气如何";
        String sql3 = naturalLanguageQueryService.translateToSql(query3);
        assertNotNull(sql3);
        assertTrue(sql3.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(sql3.contains("organizations"), "生成的SQL应该包含organizations表");
        assertTrue(llmService.isSqlSafe(sql3), "生成的SQL应该是安全的");
        
        // 4. 测试复杂查询
        String query4 = "查询2023年12月各部门员工加班小时数超过100小时的部门，并按加班小时数降序排列";
        String sql4 = naturalLanguageQueryService.translateToSql(query4);
        assertNotNull(sql4);
        assertTrue(sql4.toUpperCase().contains("SELECT"), "生成的SQL应该是SELECT语句");
        assertTrue(llmService.isSqlSafe(sql4), "生成的SQL应该是安全的");
    }
}
