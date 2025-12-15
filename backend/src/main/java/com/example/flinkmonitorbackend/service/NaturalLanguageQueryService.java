package com.example.flinkmonitorbackend.service;

import java.util.List;
import java.util.Map;

/**
 * 自然语言查询服务接口
 */
public interface NaturalLanguageQueryService {

    /**
     * 将自然语言转换为SQL查询并执行
     *
     * @param naturalLanguageQuery 自然语言查询
     * @return 查询结果
     */
    List<Map<String, Object>> executeNaturalLanguageQuery(String naturalLanguageQuery);

    /**
     * 执行自然语言查询并返回包含评估结果的数据
     *
     * @param naturalLanguageQuery 自然语言查询
     * @return 包含查询结果和评估的数据
     */
    Map<String, Object> executeNaturalLanguageQueryWithEvaluation(String naturalLanguageQuery);

    /**
     * 执行指定的SQL查询并返回包含评估结果的数据
     *
     * @param sql SQL查询语句
     * @param originalQuery 原始自然语言查询
     * @return 包含查询结果和评估的数据
     */
    Map<String, Object> executeSqlWithEvaluation(String sql, String originalQuery);

    /**
     * 将自然语言转换为SQL查询语句（不执行）
     *
     * @param naturalLanguageQuery 自然语言查询
     * @return SQL查询语句
     */
    String translateToSql(String naturalLanguageQuery);
    
    /**
     * 将自然语言转换为SQL查询语句并生成评估结果（不执行）
     *
     * @param naturalLanguageQuery 自然语言查询
     * @return 包含SQL和评估结果的数据
     */
    Map<String, Object> translateToSqlWithEvaluation(String naturalLanguageQuery);
}
