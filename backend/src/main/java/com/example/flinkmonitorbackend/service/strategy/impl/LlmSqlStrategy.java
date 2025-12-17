package com.example.flinkmonitorbackend.service.strategy.impl;

import com.example.flinkmonitorbackend.service.DatabaseMetadataService;
import com.example.flinkmonitorbackend.service.LlmService;
import com.example.flinkmonitorbackend.service.strategy.AbstractSqlGenerationStrategy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 大模型SQL策略
 * 基于大模型生成SQL查询
 */
@Component
public class LlmSqlStrategy extends AbstractSqlGenerationStrategy {
    
    @Autowired
    private LlmService llmService;
    
    @Autowired
    private DatabaseMetadataService databaseMetadataService;
    
    @Override
    public String generateSql(String naturalLanguageQuery) {
        try {
            // 获取数据库结构描述
            String databaseStructure = getDatabaseStructure();
            
            // 使用LlmService生成SQL
            String generatedSql = llmService.generateSql(naturalLanguageQuery, databaseStructure);
            
            // 清理生成的SQL
            String cleanedSql = llmService.cleanGeneratedSql(generatedSql);
            
            // 检查生成的SQL是否安全
            if (llmService.isSqlSafe(cleanedSql)) {
                return cleanedSql;
            } else {
                // 如果生成的SQL不安全，返回一个安全的默认查询
                return "SELECT id, org_name, org_code, is_active FROM organizations WHERE is_active = 1 LIMIT 10";
            }
        } catch (Exception e) {
            // 如果大模型生成失败，返回一个安全的默认查询
            return "SELECT id, org_name, org_code, is_active FROM organizations WHERE is_active = 1 LIMIT 10";
        }
    }
    
    @Override
    public String getStrategyName() {
        return "LLM Strategy";
    }
    
    @Override
    public boolean isApplicable(String naturalLanguageQuery) {
        // 大模型策略适用于所有查询，作为最终兜底策略
        return true;
    }
    
    /**
     * 获取数据库结构描述
     */
    private String getDatabaseStructure() {
        return databaseMetadataService.getDatabaseStructureDescription() + "\n" + 
               databaseMetadataService.getTableRelationships();
    }
}