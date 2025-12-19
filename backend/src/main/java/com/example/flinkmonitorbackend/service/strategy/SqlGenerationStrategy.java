package com.example.flinkmonitorbackend.service.strategy;

/**
 * SQL生成策略接口
 * 定义不同SQL生成方式的通用方法
 */
public interface SqlGenerationStrategy {
    
    /**
     * 生成SQL查询
     * @param naturalLanguageQuery 自然语言查询
     * @return 生成的SQL查询语句
     */
    String generateSql(String naturalLanguageQuery);
    
    /**
     * 获取策略名称
     * @return 策略名称
     */
    String getStrategyName();
    
    /**
     * 判断当前策略是否适用于给定的查询
     * @param naturalLanguageQuery 自然语言查询
     * @return 是否适用
     */
    boolean isApplicable(String naturalLanguageQuery);
}