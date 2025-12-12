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
     * @param naturalLanguageQuery 自然语言查询语句
     * @return 查询结果
     */
    List<Map<String, Object>> executeNaturalLanguageQuery(String naturalLanguageQuery);

    /**
     * 将自然语言转换为SQL查询语句（不执行）
     *
     * @param naturalLanguageQuery 自然语言查询语句
     * @return SQL查询语句
     */
    String translateToSql(String naturalLanguageQuery);
}
