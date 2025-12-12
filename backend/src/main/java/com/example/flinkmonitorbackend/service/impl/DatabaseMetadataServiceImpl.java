package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.service.DatabaseMetadataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 数据库元数据服务实现类
 */
@Service
public class DatabaseMetadataServiceImpl implements DatabaseMetadataService {

    @Autowired
    private DataSource dataSource;

    @Value("${spring.datasource.url}")
    private String dbUrl;

    private static final List<String> IGNORED_TABLES = List.of(
            "sys_config", "sys_user", "sys_role", "sys_permission",
            "sys_menu", "sys_log", "sys_dict", "flyway_schema_history"
    );

    /**
     * 获取所有表的基本信息
     */
    @Override
    public List<Map<String, Object>> getAllTables() {
        List<Map<String, Object>> tables = new ArrayList<>();

        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            String catalog = extractCatalog(dbUrl);
            String schemaPattern = "%";

            ResultSet tablesResultSet = metaData.getTables(catalog, schemaPattern, "%", new String[]{"TABLE"});

            while (tablesResultSet.next()) {
                String tableName = tablesResultSet.getString("TABLE_NAME");
                String tableType = tablesResultSet.getString("TABLE_TYPE");
                String remarks = tablesResultSet.getString("REMARKS");

                if (!IGNORED_TABLES.contains(tableName)) {
                    Map<String, Object> tableInfo = new HashMap<>();
                    tableInfo.put("tableName", tableName);
                    tableInfo.put("tableType", tableType);
                    tableInfo.put("remarks", remarks);
                    tables.add(tableInfo);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("获取表信息失败: " + e.getMessage(), e);
        }

        return tables;
    }

    /**
     * 获取指定表的详细结构信息
     */
    @Override
    public Map<String, Object> getTableStructure(String tableName) {
        Map<String, Object> tableStructure = new HashMap<>();
        List<Map<String, Object>> columns = new ArrayList<>();

        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            String catalog = extractCatalog(dbUrl);
            String schemaPattern = "%";

            // 获取表的基本信息
            ResultSet tableResultSet = metaData.getTables(catalog, schemaPattern, tableName, new String[]{"TABLE"});
            if (tableResultSet.next()) {
                tableStructure.put("tableName", tableResultSet.getString("TABLE_NAME"));
                tableStructure.put("tableType", tableResultSet.getString("TABLE_TYPE"));
                tableStructure.put("remarks", tableResultSet.getString("REMARKS"));
            }

            // 获取表的列信息
            ResultSet columnsResultSet = metaData.getColumns(catalog, schemaPattern, tableName, "%");
            while (columnsResultSet.next()) {
                Map<String, Object> column = new HashMap<>();
                column.put("columnName", columnsResultSet.getString("COLUMN_NAME"));
                column.put("dataType", columnsResultSet.getInt("DATA_TYPE"));
                column.put("dataTypeName", columnsResultSet.getString("TYPE_NAME"));
                column.put("columnSize", columnsResultSet.getInt("COLUMN_SIZE"));
                column.put("decimalDigits", columnsResultSet.getInt("DECIMAL_DIGITS"));
                column.put("nullable", columnsResultSet.getInt("NULLABLE") == 1);
                column.put("remarks", columnsResultSet.getString("REMARKS"));
                column.put("columnDef", columnsResultSet.getString("COLUMN_DEF"));
                columns.add(column);
            }

            // 获取表的主键信息
            ResultSet primaryKeysResultSet = metaData.getPrimaryKeys(catalog, schemaPattern, tableName);
            List<String> primaryKeys = new ArrayList<>();
            while (primaryKeysResultSet.next()) {
                primaryKeys.add(primaryKeysResultSet.getString("COLUMN_NAME"));
            }

            tableStructure.put("columns", columns);
            tableStructure.put("primaryKeys", primaryKeys);

        } catch (SQLException e) {
            throw new RuntimeException("获取表结构失败: " + e.getMessage(), e);
        }

        return tableStructure;
    }

    /**
     * 获取数据库结构的自然语言描述
     */
    @Override
    public String getDatabaseStructureDescription() {
        StringBuilder description = new StringBuilder();

        description.append("数据库包含以下主要表：\n\n");

        List<Map<String, Object>> tables = getAllTables();
        for (Map<String, Object> table : tables) {
            String tableName = (String) table.get("tableName");
            String remarks = (String) table.get("remarks");

            description.append("1. 表名：").append(tableName).append("\n");
            if (remarks != null && !remarks.isEmpty()) {
                description.append("   描述：").append(remarks).append("\n");
            }

            Map<String, Object> tableStructure = getTableStructure(tableName);
            List<Map<String, Object>> columns = (List<Map<String, Object>>) tableStructure.get("columns");
            List<String> primaryKeys = (List<String>) tableStructure.get("primaryKeys");

            description.append("   主键：").append(String.join(", ", primaryKeys)).append("\n");
            description.append("   列信息：\n");

            for (Map<String, Object> column : columns) {
                String columnName = (String) column.get("columnName");
                String dataTypeName = (String) column.get("dataTypeName");
                boolean nullable = (Boolean) column.get("nullable");
                String columnRemarks = (String) column.get("remarks");

                description.append("     - ")
                        .append(columnName)
                        .append(" (").append(dataTypeName)
                        .append(nullable ? ", 可空" : ", 非空")
                        .append(")");

                if (columnRemarks != null && !columnRemarks.isEmpty()) {
                    description.append("：").append(columnRemarks);
                }

                description.append("\n");
            }

            description.append("\n");
        }

        return description.toString();
    }

    /**
     * 获取表之间的关系描述
     */
    @Override
    public String getTableRelationships() {
        StringBuilder relationships = new StringBuilder();

        relationships.append("表之间的关系：\n\n");

        // 手动定义主要表关系
        relationships.append("1. 组织表(organizations)与其他表的关系：\n");
        relationships.append("   - exceptional_hours_records表的org_id字段关联organizations表的id字段\n");
        relationships.append("   - hrbp_leave_record表的org_id字段关联organizations表的id字段\n");
        relationships.append("   - 所有员工相关表通过emp_id关联员工信息\n");

        relationships.append("\n2. 员工相关表之间的关系：\n");
        relationships.append("   - exceptional_hours_records表的emp_id关联员工表\n");
        relationships.append("   - overtime_records表的emp_id关联员工表\n");
        relationships.append("   - hrbp_schedule_shift表的emp_id关联员工表\n");
        relationships.append("   - hrbp_gate_record表的emp_id关联员工表\n");
        relationships.append("   - hrbp_leave_record表的emp_id关联员工表\n");
        relationships.append("   - hrbp_trip_record表的emp_id关联员工表\n");

        relationships.append("\n3. 异常工时相关表：\n");
        relationships.append("   - exceptional_hours_records表的indicator_id关联exceptional_hours_indicators表的id字段\n");
        relationships.append("   - exceptional_hours_records表的org_id关联organizations表的id字段\n");

        return relationships.toString();
    }

    /**
     * 从数据库URL中提取catalog名称
     */
    private String extractCatalog(String url) {
        int dbNameStart = url.indexOf("/") + 1;
        int dbNameEnd = url.indexOf("?", dbNameStart);
        if (dbNameEnd == -1) {
            dbNameEnd = url.length();
        }
        return url.substring(dbNameStart, dbNameEnd);
    }
}
