package com.example.flinkmonitorbackend.service;

import java.util.List;
import java.util.Map;

/**
 * 数据库元数据服务接口
 */
public interface DatabaseMetadataService {

    /**
     * 获取所有表的基本信息
     *
     * @return 表信息列表
     */
    List<Map<String, Object>> getAllTables();

    /**
     * 获取指定表的详细结构信息
     *
     * @param tableName 表名
     * @return 表结构信息
     */
    Map<String, Object> getTableStructure(String tableName);

    /**
     * 获取数据库结构的自然语言描述
     *
     * @return 数据库结构的自然语言描述
     */
    String getDatabaseStructureDescription();

    /**
     * 获取表之间的关系描述
     *
     * @return 表关系描述
     */
    String getTableRelationships();
}
