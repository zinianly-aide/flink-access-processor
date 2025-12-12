package com.example.flinkmonitorbackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class OllamaServiceTest {

    private OllamaService ollamaService;

    @BeforeEach
    void setUp() {
        ollamaService = new OllamaService();
    }

    @Test
    void testGenerateSql() {
        // 测试用例1：简单查询
        String query = "查询所有部门名称";
        String databaseMetadata = "数据库包含表：organizations (id, org_name, org_code, parent_id, is_active)";
        String sql = ollamaService.generateSql(query, databaseMetadata);
        assertNotNull(sql);
        assertTrue(sql.contains("SELECT"));
        assertTrue(sql.contains("org_name"));
        assertTrue(sql.contains("organizations"));
    }

    @Test
    void testIsSqlSafe() {
        // 测试用例1：安全的SELECT语句
        String safeSql = "SELECT * FROM organizations";
        assertTrue(ollamaService.isSqlSafe(safeSql));

        // 测试用例2：危险的DROP语句
        String dangerousSql = "DROP TABLE organizations";
        assertFalse(ollamaService.isSqlSafe(dangerousSql));

        // 测试用例3：危险的UPDATE语句
        String updateSql = "UPDATE organizations SET org_name = 'test' WHERE id = 1";
        assertFalse(ollamaService.isSqlSafe(updateSql));

        // 测试用例4：包含注释的SQL
        String commentSql = "SELECT * FROM organizations -- this is a comment";
        assertFalse(ollamaService.isSqlSafe(commentSql));

        // 测试用例5：包含多个语句的SQL
        String multipleSql = "SELECT * FROM organizations; DELETE FROM organizations";
        assertFalse(ollamaService.isSqlSafe(multipleSql));
    }

    @Test
    void testCleanGeneratedSql() {
        // 测试用例1：清理带标记的SQL
        String markedSql = "```sql\nSELECT * FROM organizations\n```";
        String cleanedSql = ollamaService.cleanGeneratedSql(markedSql);
        assertEquals("SELECT * FROM organizations", cleanedSql);

        // 测试用例2：清理带前后空格的SQL
        String spacedSql = "   SELECT * FROM organizations   ";
        cleanedSql = ollamaService.cleanGeneratedSql(spacedSql);
        assertEquals("SELECT * FROM organizations", cleanedSql);

        // 测试用例3：清理空SQL
        String nullSql = null;
        cleanedSql = ollamaService.cleanGeneratedSql(nullSql);
        assertNull(cleanedSql);
    }
}
