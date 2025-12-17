package com.example.flinkmonitorbackend.service;

import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.ollama.OllamaChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import org.springframework.stereotype.Service;

/**
 * LLM服务类，用于调用不同的LLM API生成SQL查询
 */
@Service
public class LlmService {

    private final ChatLanguageModel defaultChatModel;
    private final OllamaChatModel ollamaChatModel;
    private final OpenAiChatModel openAiChatModel; // 用于DeepSeek API

    /**
     * 初始化LLM客户端
     */
    public LlmService() {
        // 创建Ollama客户端，连接本地Ollama服务
        this.ollamaChatModel = OllamaChatModel.builder()
                .baseUrl("http://localhost:11434") // Ollama默认端口
                .modelName("llama3.2:latest") // 使用本地可用的llama3.2模型
                .temperature(0.1) // 低温度，生成更确定性的结果
                .timeout(java.time.Duration.ofSeconds(60)) // 设置超时时间为60秒
                .build();

        // 创建OpenAI客户端，用于连接DeepSeek API
        // 注意：这里需要替换为实际的DeepSeek API密钥
        this.openAiChatModel = OpenAiChatModel.builder()
                .baseUrl("https://api.deepseek.com/v1") // DeepSeek API地址
                .apiKey("your-deepseek-api-key") // DeepSeek API密钥
                .modelName("deepseek-chat") // DeepSeek聊天模型
                .temperature(0.1) // 低温度，生成更确定性的结果
                .timeout(java.time.Duration.ofSeconds(60)) // 设置超时时间为60秒
                .build();

        // 默认使用Ollama模型
        this.defaultChatModel = ollamaChatModel;
    }

    /**
     * 生成SQL查询，使用默认模型
     *
     * @param naturalLanguageQuery 自然语言查询
     * @param databaseMetadata 数据库元数据描述
     * @return 生成的SQL查询语句
     */
    public String generateSql(String naturalLanguageQuery, String databaseMetadata) {
        return generateSql(naturalLanguageQuery, databaseMetadata, "ollama");
    }

    /**
     * 生成SQL查询，指定模型提供商
     *
     * @param naturalLanguageQuery 自然语言查询
     * @param databaseMetadata 数据库元数据描述
     * @param provider 模型提供商：ollama或deepseek
     * @return 生成的SQL查询语句
     */
    public String generateSql(String naturalLanguageQuery, String databaseMetadata, String provider) {
        // 构建提示词，包含数据库元数据和用户查询
        String prompt = buildSqlGenerationPrompt(naturalLanguageQuery, databaseMetadata);
        
        // 根据提供商选择模型
        ChatLanguageModel model = getChatModelByProvider(provider);
        
        // 调用API生成SQL
        return model.generate(prompt);
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
        if (upperSql.contains(";;")) {
            // 只允许单个SELECT语句，过滤掉空字符串元素
            String[] statements = upperSql.split(";;").clone();
            int actualStatementCount = 0;
            for (String statement : statements) {
                if (statement.trim().length() > 0) {
                    actualStatementCount++;
                }
            }
            if (actualStatementCount > 1) {
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

    /**
     * 评估SQL查询结果，生成自然语言描述
     *
     * @param query 原始自然语言查询
     * @param sql 生成的SQL语句
     * @param results 查询结果
     * @return 结果评估的自然语言描述
     */
    public String evaluateSqlResults(String query, String sql, Object results) {
        return evaluateSqlResults(query, sql, results, "ollama");
    }

    /**
     * 评估SQL查询结果，生成自然语言描述，指定模型提供商
     *
     * @param query 原始自然语言查询
     * @param sql 生成的SQL语句
     * @param results 查询结果
     * @param provider 模型提供商：ollama或deepseek
     * @return 结果评估的自然语言描述
     */
    public String evaluateSqlResults(String query, String sql, Object results, String provider) {
        // 构建评估提示词
        String prompt = buildEvaluationPrompt(query, sql, results);
        
        // 根据提供商选择模型
        ChatLanguageModel model = getChatModelByProvider(provider);
        
        // 调用API生成评估
        return model.generate(prompt);
    }

    /**
     * 构建结果评估提示词
     *
     * @param query 原始自然语言查询
     * @param sql 生成的SQL语句
     * @param results 查询结果
     * @return 构建好的提示词
     */
    private String buildEvaluationPrompt(String query, String sql, Object results) {
        return "你是一个数据分析助手，请根据以下信息评估SQL查询结果：\n" +
                "\n1. 原始自然语言查询：\n" + query + "\n" +
                "\n2. 生成的SQL语句：\n" + sql + "\n" +
                "\n3. 查询结果：\n" + results + "\n" +
                "\n请严格遵守以下规则：\n" +
                "1. 用自然语言描述查询结果，要清晰、准确、简洁\n" +
                "2. 分析查询结果是否符合用户的查询意图\n" +
                "3. 如果结果有异常或不符合预期，请指出\n" +
                "4. 不要添加任何与评估无关的内容\n" +
                "5. 不要返回SQL语句，只返回评估描述\n" +
                "\n请生成评估结果：\n";
    }

    /**
     * 根据提供商选择聊天模型
     *
     * @param provider 模型提供商：ollama或deepseek
     * @return 聊天模型实例
     */
    private ChatLanguageModel getChatModelByProvider(String provider) {
        if (provider == null) {
            return defaultChatModel;
        }

        return switch (provider.toLowerCase()) {
            case "deepseek" -> openAiChatModel;
            case "ollama" -> ollamaChatModel;
            default -> defaultChatModel;
        };
    }
}