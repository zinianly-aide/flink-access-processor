package com.example.flinkmonitorbackend.service.strategy;

/**
 * SQL生成策略抽象基类
 * 实现通用方法，减少具体策略类的重复代码
 */
public abstract class AbstractSqlGenerationStrategy implements SqlGenerationStrategy {
    
    /**
     * 默认实现：将查询转换为小写进行处理
     * @param naturalLanguageQuery 自然语言查询
     * @return 标准化后的查询
     */
    protected String normalizeQuery(String naturalLanguageQuery) {
        return naturalLanguageQuery.toLowerCase().trim();
    }
    
    /**
     * 默认实现：简单检查查询是否为空
     * @param naturalLanguageQuery 自然语言查询
     * @return 是否有效
     */
    protected boolean isValidQuery(String naturalLanguageQuery) {
        return naturalLanguageQuery != null && !naturalLanguageQuery.trim().isEmpty();
    }
}