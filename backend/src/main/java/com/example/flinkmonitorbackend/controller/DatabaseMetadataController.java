package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.service.DatabaseMetadataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 数据库元数据API控制器
 */
@RestController
@RequestMapping("/database-metadata")
public class DatabaseMetadataController {

    @Autowired
    private DatabaseMetadataService databaseMetadataService;

    /**
     * 获取所有表的基本信息
     */
    @GetMapping("/tables")
    public ResponseEntity<List<Map<String, Object>>> getAllTables() {
        List<Map<String, Object>> tables = databaseMetadataService.getAllTables();
        return ResponseEntity.ok(tables);
    }

    /**
     * 获取指定表的详细结构信息
     */
    @GetMapping("/tables/{tableName}")
    public ResponseEntity<Map<String, Object>> getTableStructure(@PathVariable String tableName) {
        Map<String, Object> tableStructure = databaseMetadataService.getTableStructure(tableName);
        return ResponseEntity.ok(tableStructure);
    }

    /**
     * 获取数据库结构的自然语言描述
     */
    @GetMapping("/description")
    public ResponseEntity<Map<String, String>> getDatabaseDescription() {
        String description = databaseMetadataService.getDatabaseStructureDescription();
        return ResponseEntity.ok(Map.of("description", description));
    }

    /**
     * 获取表之间的关系描述
     */
    @GetMapping("/relationships")
    public ResponseEntity<Map<String, String>> getTableRelationships() {
        String relationships = databaseMetadataService.getTableRelationships();
        return ResponseEntity.ok(Map.of("relationships", relationships));
    }

    /**
     * 获取完整的数据库结构信息，包括表结构和关系
     */
    @GetMapping("/complete")
    public ResponseEntity<Map<String, String>> getCompleteDatabaseStructure() {
        String description = databaseMetadataService.getDatabaseStructureDescription();
        String relationships = databaseMetadataService.getTableRelationships();
        
        return ResponseEntity.ok(Map.of(
                "description", description,
                "relationships", relationships
        ));
    }
}
