package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.service.NaturalLanguageQueryService;
import com.example.flinkmonitorbackend.utils.RequestGuardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;

/**
 * 自然语言查询API控制器
 */
@RestController
@RequestMapping("/natural-language-query")
public class NaturalLanguageQueryController {

    @Autowired
    private NaturalLanguageQueryService naturalLanguageQueryService;

    @Autowired
    private RequestGuardService requestGuardService;

    private static final String SUCCESS_CODE = "SUCCESS";
    private static final String VALIDATION_ERROR = "VALIDATION_ERROR";
    private static final String RATE_LIMITED = "RATE_LIMITED";
    private static final String SERVER_ERROR = "SERVER_ERROR";

    /**
     * 执行自然语言查询
     */
    @PostMapping("/execute")
    public ResponseEntity<Map<String, Object>> executeQuery(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String naturalLanguageQuery = request.get("query");
        String clientKey = resolveClientKey(httpRequest);

        if (naturalLanguageQuery == null || naturalLanguageQuery.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(errorResponse(VALIDATION_ERROR, "查询内容不能为空"));
        }

        if (!requestGuardService.tryAcquire(clientKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(errorResponse(RATE_LIMITED, "请求过于频繁，请稍后重试"));
        }

        String cacheKey = requestGuardService.buildCacheKey(clientKey, "execute", naturalLanguageQuery);
        return requestGuardService.getCachedResponse(cacheKey)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    try {
                        Map<String, Object> resultsWithEvaluation = naturalLanguageQueryService.executeNaturalLanguageQueryWithEvaluation(naturalLanguageQuery);
                        Map<String, Object> response = Map.of(
                                "success", true,
                                "code", SUCCESS_CODE,
                                "data", resultsWithEvaluation,
                                "message", "查询成功"
                        );
                        requestGuardService.cacheResponse(cacheKey, response);
                        return ResponseEntity.ok(response);
                    } catch (SecurityException | IllegalArgumentException e) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(errorResponse(VALIDATION_ERROR, e.getMessage()));
                    } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(errorResponse(SERVER_ERROR, "查询失败，请稍后重试"));
                    }
                });
    }

    /**
     * 将自然语言转换为SQL（不执行）
     */
    @PostMapping("/translate-to-sql")
    public ResponseEntity<Map<String, Object>> translateToSql(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String naturalLanguageQuery = request.get("query");
        String clientKey = resolveClientKey(httpRequest);

        if (naturalLanguageQuery == null || naturalLanguageQuery.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(errorResponse(VALIDATION_ERROR, "查询内容不能为空"));
        }

        if (!requestGuardService.tryAcquire(clientKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(errorResponse(RATE_LIMITED, "请求过于频繁，请稍后重试"));
        }

        String cacheKey = requestGuardService.buildCacheKey(clientKey, "translate", naturalLanguageQuery);
        return requestGuardService.getCachedResponse(cacheKey)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    try {
                        String sql = naturalLanguageQueryService.translateToSql(naturalLanguageQuery);
                        Map<String, Object> response = Map.of(
                                "success", true,
                                "code", SUCCESS_CODE,
                                "sql", sql,
                                "message", "转换成功"
                        );
                        requestGuardService.cacheResponse(cacheKey, response);
                        return ResponseEntity.ok(response);
                    } catch (SecurityException | IllegalArgumentException e) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(errorResponse(VALIDATION_ERROR, e.getMessage()));
                    } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(errorResponse(SERVER_ERROR, "转换失败，请稍后重试"));
                    }
                });
    }
    
    /**
     * 将自然语言转换为SQL并生成评估结果（不执行）
     */
    @PostMapping("/translate-to-sql-with-evaluation")
    public ResponseEntity<Map<String, Object>> translateToSqlWithEvaluation(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String naturalLanguageQuery = request.get("query");
        String clientKey = resolveClientKey(httpRequest);

        if (naturalLanguageQuery == null || naturalLanguageQuery.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(errorResponse(VALIDATION_ERROR, "查询内容不能为空"));
        }

        if (!requestGuardService.tryAcquire(clientKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(errorResponse(RATE_LIMITED, "请求过于频繁，请稍后重试"));
        }

        String cacheKey = requestGuardService.buildCacheKey(clientKey, "translate-eval", naturalLanguageQuery);
        return requestGuardService.getCachedResponse(cacheKey)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    try {
                        Map<String, Object> result = naturalLanguageQueryService.translateToSqlWithEvaluation(naturalLanguageQuery);
                        Map<String, Object> response = Map.of(
                                "success", true,
                                "code", SUCCESS_CODE,
                                "data", result,
                                "message", "转换和评估成功"
                        );
                        requestGuardService.cacheResponse(cacheKey, response);
                        return ResponseEntity.ok(response);
                    } catch (SecurityException | IllegalArgumentException e) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(errorResponse(VALIDATION_ERROR, e.getMessage()));
                    } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(errorResponse(SERVER_ERROR, "转换和评估失败，请稍后重试"));
                    }
                });
    }
    
    /**
     * 执行指定的SQL查询并返回评估结果
     */
    @PostMapping("/execute-sql")
    public ResponseEntity<Map<String, Object>> executeSql(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String sql = request.get("sql");
        String originalQuery = request.get("originalQuery");
        
        if (sql == null || sql.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(errorResponse(VALIDATION_ERROR, "SQL语句不能为空"));
        }

        String clientKey = resolveClientKey(httpRequest);

        if (!requestGuardService.tryAcquire(clientKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(errorResponse(RATE_LIMITED, "请求过于频繁，请稍后重试"));
        }

        String cacheKey = requestGuardService.buildCacheKey(clientKey, "execute-sql", sql + originalQuery);
        return requestGuardService.getCachedResponse(cacheKey)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    try {
                        Map<String, Object> resultsWithEvaluation = naturalLanguageQueryService.executeSqlWithEvaluation(sql, originalQuery);
                        Map<String, Object> response = Map.of(
                                "success", true,
                                "code", SUCCESS_CODE,
                                "data", resultsWithEvaluation,
                                "message", "查询成功"
                        );
                        requestGuardService.cacheResponse(cacheKey, response);
                        return ResponseEntity.ok(response);
                    } catch (SecurityException | IllegalArgumentException e) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(errorResponse(VALIDATION_ERROR, e.getMessage()));
                    } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(errorResponse(SERVER_ERROR, "查询失败，请稍后重试"));
                    }
                });
    }

    private String resolveClientKey(HttpServletRequest request) {
        if (request == null) {
            return "anonymous";
        }

        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }

        String remoteAddr = request.getRemoteAddr();
        return remoteAddr == null ? "anonymous" : remoteAddr;
    }

    private Map<String, Object> errorResponse(String code, String message) {
        return Map.of(
                "success", false,
                "code", code,
                "message", message
        );
    }
}
