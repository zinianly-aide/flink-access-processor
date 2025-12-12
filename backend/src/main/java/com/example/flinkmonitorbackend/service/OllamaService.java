package com.example.flinkmonitorbackend.service;

import dev.langchain4j.model.ollama.OllamaChatModel;
import org.springframework.stereotype.Service;

/**
 * Ollama服务类，用于调用Ollama API生成SQL查询
 */
@Service
public class OllamaService {

    private final OllamaChatModel ollamaChatModel;

    /**
     * 初始化Ollama客户端
     */
    public OllamaService() {
        // 创建Ollama客户端，连接本地Ollama服务
        this.ollamaChatModel = OllamaChatModel.builder()
                .baseUrl("http://localhost:11434") // Ollama默认端口
                .modelName("llama3.2:latest") // 使用本地可用的llama3.2模型
                .temperature(0.1) // 低温度，生成更确定性的结果
                .build();
    }

    /**
     * 生成SQL查询
     *
     * @param naturalLanguageQuery 自然语言查询
     * @param databaseMetadata 数据库元数据描述
     * @return 生成的SQL查询语句
     */
    public String generateSql(String naturalLanguageQuery, String databaseMetadata) {
        // 构建提示词，包含数据库元数据和用户查询
        String prompt = buildSqlGenerationPrompt(naturalLanguageQuery, databaseMetadata);
        
        // 调用Ollama API生成SQL
        return ollamaChatModel.generate(prompt);
    }

    /**
     * 构建SQL生成提示词
     *
     * @param naturalLanguageQuery 自然语言查询
     * @param databaseMetadata 数据库元数据描述
     * @return 构建好的提示词
     */
    private String buildSqlGenerationPrompt(String naturalLanguageQuery, String databaseMetadata) {
        return "你是一个专业的SQL生成助手，请根据以下数据库元数据和用户的自然语言查询，生成准确的SQL查询语句。\n" +
                "\n数据库元数据：\n" + databaseMetadata + "\n" +
                "\n用户的自然语言查询：\n" + naturalLanguageQuery + "\n" +
                "\n请严格遵守以下规则：\n" +
                "1. 只生成SQL语句，不要添加任何解释或其他内容\n" +
                "2. 确保SQL语句语法正确，能够直接执行\n" +
                "3. 只查询必要的字段，避免使用SELECT *\n" +
                "4. 确保WHERE条件准确，只查询相关数据\n" +
                "5. 按照结果的重要性进行排序\n" +
                "6. 过滤掉危险的SQL操作，如DROP、ALTER、TRUNCATE等\n" +
                "7. 只生成SELECT语句，不要生成其他类型的SQL语句\n" +
                "8. 确保生成的SQL语句能够处理NULL值\n" +
                "\n请生成SQL查询语句：\n";
    }

    /**
     * 检查SQL是否安全
     *
     * @param sql 要检查的SQL语句
     * @return 是否安全
     */
    public boolean isSqlSafe(String sql) {
        if (sql == null || sql.trim().isEmpty()) {
            return false;
        }

        // 转换为大写，便于检查
        String upperSql = sql.toUpperCase();

        // 禁止的SQL操作
        String[] dangerousKeywords = {
                "DROP", "ALTER", "TRUNCATE", "DELETE", "UPDATE", "INSERT", "CREATE",
                "GRANT", "REVOKE", "EXEC", "EXECUTE", "CALL", "MERGE", "LOCK",
                "UNLOCK", "COMMIT", "ROLLBACK", "SAVEPOINT", "RELEASE", "SET",
                "SHOW", "USE", "LOAD", "DUMP", "BACKUP", "RESTORE"
        };

        // 检查是否包含危险关键字
        for (String keyword : dangerousKeywords) {
            if (upperSql.contains(" " + keyword + " ") || upperSql.startsWith(keyword + " ") || upperSql.contains(" " + keyword + ";")) {
                return false;
            }
        }

        // 检查是否包含注释，防止SQL注入
        if (upperSql.contains("--") || upperSql.contains("/*")) {
            return false;
        }

        // 检查是否包含多个语句
        if (upperSql.contains(";")) {
            // 只允许单个SELECT语句
            String[] statements = upperSql.split(";").clone();
            if (statements.length > 1) {
                return false;
            }
        }

        // 确保是SELECT语句
        return upperSql.startsWith("SELECT");
    }

    /**
     * 清理生成的SQL，移除不必要的内容
     *
     * @param sql 生成的SQL语句
     * @return 清理后的SQL语句
     */
    public String cleanGeneratedSql(String sql) {
        if (sql == null) {
            return null;
        }

        // 移除前后空格
        String cleanedSql = sql.trim();

        // 移除SQL语句前后可能的标记，如```sql和```
        if (cleanedSql.startsWith("```sql")) {
            cleanedSql = cleanedSql.substring(6);
        }
        if (cleanedSql.endsWith("```")) {
            cleanedSql = cleanedSql.substring(0, cleanedSql.length() - 3);
        }

        // 移除前后空格
        cleanedSql = cleanedSql.trim();

        return cleanedSql;
    }
}
