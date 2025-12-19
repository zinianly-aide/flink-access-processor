package com.example.flinkmonitorbackend.service.strategy;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * SQL生成策略管理器
 * 管理和调用不同的SQL生成策略
 */
@Component
public class SqlGenerationStrategyManager {
    
    private final List<SqlGenerationStrategy> strategies;
    
    @Autowired
    public SqlGenerationStrategyManager(List<SqlGenerationStrategy> strategies) {
        this.strategies = strategies;
    }
    
    /**
     * 生成SQL查询
     * 按照优先级顺序尝试使用不同的策略
     * @param naturalLanguageQuery 自然语言查询
     * @return 生成的SQL查询语句
     */
    public String generateSql(String naturalLanguageQuery) {
        // 按照优先级顺序尝试使用不同的策略
        // 优先级：模板策略 > 表映射策略 > 正则策略 > 元数据策略 > 大模型策略
        
        // 模板策略
        SqlGenerationStrategy templateStrategy = getStrategyByClass("com.example.flinkmonitorbackend.service.strategy.impl.TemplateSqlStrategy");
        if (templateStrategy != null && templateStrategy.isApplicable(naturalLanguageQuery)) {
            String sql = templateStrategy.generateSql(naturalLanguageQuery);
            if (sql != null) {
                return sql;
            }
        }
        
        // 表映射策略
        SqlGenerationStrategy tableMappingStrategy = getStrategyByClass("com.example.flinkmonitorbackend.service.strategy.impl.TableMappingSqlStrategy");
        if (tableMappingStrategy != null && tableMappingStrategy.isApplicable(naturalLanguageQuery)) {
            String sql = tableMappingStrategy.generateSql(naturalLanguageQuery);
            if (sql != null) {
                return sql;
            }
        }
        
        // 正则策略
        SqlGenerationStrategy regexStrategy = getStrategyByClass("com.example.flinkmonitorbackend.service.strategy.impl.RegexSqlStrategy");
        if (regexStrategy != null && regexStrategy.isApplicable(naturalLanguageQuery)) {
            String sql = regexStrategy.generateSql(naturalLanguageQuery);
            if (sql != null) {
                return sql;
            }
        }
        
        // 元数据策略
        SqlGenerationStrategy metadataStrategy = getStrategyByClass("com.example.flinkmonitorbackend.service.strategy.impl.MetadataSqlStrategy");
        if (metadataStrategy != null && metadataStrategy.isApplicable(naturalLanguageQuery)) {
            String sql = metadataStrategy.generateSql(naturalLanguageQuery);
            if (sql != null) {
                return sql;
            }
        }
        
        // 大模型策略（兜底策略）
        SqlGenerationStrategy llmStrategy = getStrategyByClass("com.example.flinkmonitorbackend.service.strategy.impl.LlmSqlStrategy");
        if (llmStrategy != null) {
            return llmStrategy.generateSql(naturalLanguageQuery);
        }
        
        // 最后兜底，返回一个安全的默认查询
        return "SELECT id, org_name, org_code, is_active FROM organizations WHERE is_active = 1 LIMIT 10";
    }
    
    /**
     * 根据类名获取策略实例
     * @param className 策略类名
     * @return 策略实例
     */
    private SqlGenerationStrategy getStrategyByClass(String className) {
        return strategies.stream()
                .filter(strategy -> strategy.getClass().getName().equals(className))
                .findFirst()
                .orElse(null);
    }
    
    /**
     * 获取所有策略
     * @return 策略列表
     */
    public List<SqlGenerationStrategy> getAllStrategies() {
        return strategies;
    }
}