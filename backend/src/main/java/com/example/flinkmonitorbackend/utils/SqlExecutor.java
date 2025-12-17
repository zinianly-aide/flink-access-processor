package com.example.flinkmonitorbackend.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.example.flinkmonitorbackend.utils.SqlValidationService;

import javax.sql.DataSource;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * SQL执行工具类
 */
@Component
public class SqlExecutor {

    private static final Logger log = LoggerFactory.getLogger(SqlExecutor.class);
    private static final int MAX_ROWS = 500;
    private static final int QUERY_TIMEOUT_SECONDS = 30;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private SqlValidationService sqlValidationService;

    /**
     * 执行SQL查询并返回结果
     */
    public List<Map<String, Object>> executeQuery(String sql) throws SQLException {
        List<Map<String, Object>> results = new ArrayList<>();
        String sanitizedSql = sqlValidationService.sanitizeSql(sql);
        long startTime = System.currentTimeMillis();
        boolean success = false;
        int rowCount = 0;
        int effectiveMaxRows = Math.min(MAX_ROWS, sqlValidationService.getMaxLimit());

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sanitizedSql)) {

            stmt.setMaxRows(effectiveMaxRows);
            stmt.setQueryTimeout(QUERY_TIMEOUT_SECONDS);

            try (ResultSet rs = stmt.executeQuery()) {
                ResultSetMetaData metaData = rs.getMetaData();
                int columnCount = metaData.getColumnCount();

                while (rs.next()) {
                    Map<String, Object> row = new HashMap<>();
                    for (int i = 1; i <= columnCount; i++) {
                        String columnName = metaData.getColumnName(i);
                        Object value = rs.getObject(i);
                        row.put(columnName, value);
                    }
                    results.add(row);
                }

                rowCount = results.size();
                success = true;
            }
        } catch (SQLException e) {
            log.warn("SQL执行失败: {}", e.getMessage());
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            log.info("SQL审计日志: success={}, duration={}ms, rows={}, sql={}", success, duration, rowCount, sanitizedSql);
        }
        return results;
    }
}
