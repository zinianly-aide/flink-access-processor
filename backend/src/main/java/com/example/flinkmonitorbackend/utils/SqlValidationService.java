package com.example.flinkmonitorbackend.utils;

import com.example.flinkmonitorbackend.service.DatabaseMetadataService;
import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.expression.Alias;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;
import net.sf.jsqlparser.expression.operators.relational.ExpressionList;
import net.sf.jsqlparser.util.deparser.ExpressionVisitorAdapter;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.schema.Column;
import net.sf.jsqlparser.schema.Table;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.select.*;
import net.sf.jsqlparser.util.deparser.SelectItemVisitorAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
public class SqlValidationService {

    private static final Logger log = LoggerFactory.getLogger(SqlValidationService.class);

    private static final Set<String> TABLE_WHITELIST = Set.of(
            "organizations",
            "hrbp_leave_record",
            "overtime_records",
            "exceptional_hours_records",
            "hrbp_gate_record",
            "hrbp_schedule_shift",
            "hrbp_trip_record",
            "consecutive_work_days",
            "employee"
    );

    private static final Map<String, Set<String>> STATIC_ALLOWED_COLUMNS = Map.of(
            "organizations", Set.of("id", "org_name", "org_code", "parent_id", "is_active"),
            "hrbp_leave_record", Set.of("id", "emp_id", "org_id", "start_time", "end_time", "leave_type", "leave_hours"),
            "overtime_records", Set.of("id", "emp_id", "work_date", "actual_hours", "regular_hours", "overtime_hours"),
            "exceptional_hours_records", Set.of("id", "emp_id", "org_id", "indicator_name", "actual_value", "threshold", "status", "created_at"),
            "hrbp_gate_record", Set.of("id", "emp_id", "org_id", "device_id", "event_time", "event_type"),
            "hrbp_schedule_shift", Set.of("id", "emp_id", "org_id", "shift_date"),
            "hrbp_trip_record", Set.of("id", "emp_id", "org_id", "start_date"),
            "consecutive_work_days", Set.of("id", "emp_id", "org_id", "work_date", "consecutive_days"),
            "employee", Set.of("id", "name", "status")
    );

    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 200;

    private final DatabaseMetadataService databaseMetadataService;
    private final Map<String, Set<String>> allowedColumnsCache = new ConcurrentHashMap<>();

    public SqlValidationService(DatabaseMetadataService databaseMetadataService) {
        this.databaseMetadataService = databaseMetadataService;
    }

    public String sanitizeSql(String sql) {
        try {
            Statement statement = CCJSqlParserUtil.parse(sql);
            if (!(statement instanceof Select select)) {
                throw new SecurityException("只允许执行SELECT语句");
            }

            if (select.getWithItemsList() != null && !select.getWithItemsList().isEmpty()) {
                throw new SecurityException("禁止使用CTE子句");
            }

            SelectBody selectBody = select.getSelectBody();
            if (selectBody instanceof PlainSelect plainSelect) {
                rejectSubSelects(plainSelect);
                Map<String, String> aliasToTable = buildAliasMapping(plainSelect);
                List<String> tablesInQuery = extractTables(plainSelect, aliasToTable);
                enforceColumnWhitelist(plainSelect, aliasToTable, tablesInQuery);
                enforceLimit(plainSelect);
            } else {
                throw new SecurityException("仅允许简单的SELECT查询，禁止子查询或集合操作");
            }

            return select.toString();
        } catch (JSQLParserException e) {
            throw new SecurityException("SQL解析失败，已拒绝执行", e);
        }
    }

    public List<String> getAllowedColumns(String tableName) {
        String normalizedTable = tableName.toLowerCase();
        if (!TABLE_WHITELIST.contains(normalizedTable)) {
            return List.of();
        }

        return new ArrayList<>(allowedColumnsCache.computeIfAbsent(normalizedTable, this::loadAllowedColumns));
    }

    public int getMaxLimit() {
        return MAX_LIMIT;
    }

    private List<String> enforceColumnWhitelist(PlainSelect plainSelect, Map<String, String> aliasToTable, List<String> tables) {
        Set<Column> referencedColumns = new HashSet<>();

        plainSelect.getSelectItems().forEach(item -> item.accept(new SelectItemVisitorAdapter() {
            @Override
            public void visit(SelectExpressionItem selectExpressionItem) {
                collectColumns(selectExpressionItem.getExpression(), referencedColumns);
            }

            @Override
            public void visit(AllColumns allColumns) {
                throw new SecurityException("不允许使用通配符选择列");
            }

            @Override
            public void visit(AllTableColumns allTableColumns) {
                throw new SecurityException("请显式列出需要的字段，禁止使用表级通配符");
            }
        }));

        if (plainSelect.getWhere() != null) {
            collectColumns(plainSelect.getWhere(), referencedColumns);
        }

        if (plainSelect.getHaving() != null) {
            collectColumns(plainSelect.getHaving(), referencedColumns);
        }

        if (plainSelect.getGroupBy() != null && plainSelect.getGroupBy().getGroupByExpressions() != null) {
            for (Expression expression : plainSelect.getGroupBy().getGroupByExpressions()) {
                collectColumns(expression, referencedColumns);
            }
        }

        if (plainSelect.getOrderByElements() != null) {
            for (OrderByElement orderByElement : plainSelect.getOrderByElements()) {
                collectColumns(orderByElement.getExpression(), referencedColumns);
            }
        }

        for (Column column : referencedColumns) {
            String tableName = resolveTableName(column.getTable(), aliasToTable, tables);
            Set<String> allowedColumns = new HashSet<>(getAllowedColumns(tableName));
            if (!allowedColumns.contains(column.getColumnName().toLowerCase())) {
                throw new SecurityException("列不在白名单中: " + column.getColumnName());
            }
        }

        return referencedColumns.stream().map(Column::getColumnName).collect(Collectors.toList());
    }

    private void enforceLimit(PlainSelect plainSelect) {
        Limit limit = plainSelect.getLimit();
        if (limit == null) {
            limit = new Limit();
            limit.setRowCount(new LongValue(DEFAULT_LIMIT));
            plainSelect.setLimit(limit);
            return;
        }

        if (!(limit.getRowCount() instanceof LongValue)) {
            limit.setRowCount(new LongValue(DEFAULT_LIMIT));
            return;
        }

        if (limit.getRowCount() instanceof LongValue longValue) {
            long current = longValue.getValue();
            if (current <= 0 || current > MAX_LIMIT) {
                limit.setRowCount(new LongValue(MAX_LIMIT));
            }
        }
    }

    private void rejectSubSelects(PlainSelect plainSelect) {
        if (!(plainSelect.getFromItem() instanceof Table)) {
            throw new SecurityException("禁止使用子查询作为数据源");
        }

        if (plainSelect.getJoins() != null) {
            for (Join join : plainSelect.getJoins()) {
                if (!(join.getRightItem() instanceof Table)) {
                    throw new SecurityException("禁止在JOIN中使用子查询");
                }
            }
        }

        ExpressionVisitorAdapter visitor = new ExpressionVisitorAdapter() {
            @Override
            public void visit(SubSelect subSelect) {
                throw new SecurityException("检测到子查询，已被拒绝");
            }
        };

        if (plainSelect.getWhere() != null) {
            plainSelect.getWhere().accept(visitor);
        }

        if (plainSelect.getHaving() != null) {
            plainSelect.getHaving().accept(visitor);
        }

        if (plainSelect.getSelectItems() != null) {
            for (SelectItem item : plainSelect.getSelectItems()) {
                item.accept(new SelectItemVisitorAdapter() {
                    @Override
                    public void visit(SelectExpressionItem selectExpressionItem) {
                        if (selectExpressionItem.getExpression() != null) {
                            selectExpressionItem.getExpression().accept(visitor);
                        }
                    }
                });
            }
        }
    }

    private Map<String, String> buildAliasMapping(PlainSelect plainSelect) {
        Map<String, String> aliasToTable = new HashMap<>();
        if (plainSelect.getFromItem() instanceof Table table) {
            registerAlias(aliasToTable, table);
        }

        if (plainSelect.getJoins() != null) {
            for (Join join : plainSelect.getJoins()) {
                if (join.getRightItem() instanceof Table joinTable) {
                    registerAlias(aliasToTable, joinTable);
                }
            }
        }
        return aliasToTable;
    }

    private List<String> extractTables(PlainSelect plainSelect, Map<String, String> aliasToTable) {
        List<String> tables = new ArrayList<>();
        if (plainSelect.getFromItem() instanceof Table table) {
            String normalized = table.getName().toLowerCase();
            validateTable(normalized);
            tables.add(normalized);
        }

        if (plainSelect.getJoins() != null) {
            for (Join join : plainSelect.getJoins()) {
                if (join.getRightItem() instanceof Table joinTable) {
                    String normalized = joinTable.getName().toLowerCase();
                    validateTable(normalized);
                    tables.add(normalized);
                }
            }
        }
        return tables;
    }

    private void validateTable(String tableName) {
        if (!TABLE_WHITELIST.contains(tableName)) {
            throw new SecurityException("表不在白名单中: " + tableName);
        }
    }

    private void registerAlias(Map<String, String> aliasToTable, Table table) {
        Alias alias = table.getAlias();
        if (alias != null && alias.getName() != null) {
            aliasToTable.put(alias.getName().toLowerCase(), table.getName().toLowerCase());
        }
    }

    private String resolveTableName(Table table, Map<String, String> aliasToTable, List<String> tables) {
        if (table != null && table.getName() != null) {
            String provided = table.getName().toLowerCase();
            return aliasToTable.getOrDefault(provided, provided);
        }

        if (tables.size() == 1) {
            return tables.get(0);
        }

        throw new SecurityException("无法确定列所属的表，拒绝执行");
    }

    private void collectColumns(Expression expression, Set<Column> columns) {
        if (expression == null) {
            return;
        }

        if (expression instanceof ExpressionList expressionList && expressionList.getExpressions() != null) {
            for (Expression expr : expressionList.getExpressions()) {
                collectColumns(expr, columns);
            }
            return;
        }

        expression.accept(new ExpressionVisitorAdapter() {
            @Override
            public void visit(Column column) {
                columns.add(column);
            }
        });
    }

    private void validateColumnsForTable(String tableName, List<String> allowedColumns) {
        if (allowedColumns.isEmpty()) {
            throw new SecurityException("表缺少允许的列配置: " + tableName);
        }
    }

    private Set<String> loadAllowedColumns(String tableName) {
        try {
            Map<String, Object> structure = databaseMetadataService.getTableStructure(tableName);
            Object rawColumns = structure.get("columns");
            Set<String> metadataColumns = new HashSet<>();
            if (rawColumns instanceof List<?> columnList) {
                for (Object colObj : columnList) {
                    if (colObj instanceof Map<?, ?> column) {
                        Object name = column.get("columnName");
                        if (name instanceof String columnName) {
                            metadataColumns.add(columnName.toLowerCase());
                        }
                    }
                }
            }

            Set<String> staticAllowed = STATIC_ALLOWED_COLUMNS.getOrDefault(tableName, Set.of());
            if (!staticAllowed.isEmpty()) {
                if (!metadataColumns.isEmpty()) {
                    metadataColumns.retainAll(staticAllowed);
                    return metadataColumns.isEmpty() ? new HashSet<>(staticAllowed) : metadataColumns;
                }
                return new HashSet<>(staticAllowed);
            }

            return metadataColumns;
        } catch (Exception ex) {
            log.warn("加载表{}的列信息失败: {}", tableName, ex.getMessage());
            return STATIC_ALLOWED_COLUMNS.getOrDefault(tableName, Set.of());
        }
    }
}
