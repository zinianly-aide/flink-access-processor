package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.service.NaturalLanguageQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    /**
     * 执行自然语言查询
     */
    @PostMapping("/execute")
    public ResponseEntity<Map<String, Object>> executeQuery(@RequestBody Map<String, String> request) {
        String naturalLanguageQuery = request.get("query");
        try {
            List<Map<String, Object>> results = naturalLanguageQueryService.executeNaturalLanguageQuery(naturalLanguageQuery);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "results", results,
                    "message", "查询成功"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "查询失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 将自然语言转换为SQL（不执行）
     */
    @PostMapping("/translate-to-sql")
    public ResponseEntity<Map<String, Object>> translateToSql(@RequestBody Map<String, String> request) {
        String naturalLanguageQuery = request.get("query");
        try {
            String sql = naturalLanguageQueryService.translateToSql(naturalLanguageQuery);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "sql", sql,
                    "message", "转换成功"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "转换失败: " + e.getMessage()
            ));
        }
    }
}
