package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.entity.ApiMetadata;
import com.example.flinkmonitorbackend.service.ApiMetadataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * API元数据控制器，用于对外提供API元数据服务
 */
@RestController
@RequestMapping("/api-metadata")
public class ApiMetadataController {
    
    @Autowired
    private ApiMetadataService apiMetadataService;
    
    /**
     * 获取所有API元数据
     */
    @GetMapping
    public ResponseEntity<List<ApiMetadata>> getAllApis() {
        List<ApiMetadata> apis = apiMetadataService.getAllApis();
        return new ResponseEntity<>(apis, HttpStatus.OK);
    }
    
    /**
     * 根据API ID获取API元数据
     */
    @GetMapping("/{apiId}")
    public ResponseEntity<ApiMetadata> getApiById(@PathVariable String apiId) {
        ApiMetadata api = apiMetadataService.getApiById(apiId);
        if (api == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(api, HttpStatus.OK);
    }
    
    /**
     * 根据HTTP方法获取API元数据
     */
    @GetMapping("/by-method/{httpMethod}")
    public ResponseEntity<List<ApiMetadata>> getApisByHttpMethod(@PathVariable String httpMethod) {
        List<ApiMetadata> apis = apiMetadataService.getApisByHttpMethod(httpMethod);
        return new ResponseEntity<>(apis, HttpStatus.OK);
    }
    
    /**
     * 根据URL路径模式获取API元数据
     */
    @GetMapping("/by-url/{urlPattern}")
    public ResponseEntity<List<ApiMetadata>> getApisByUrlPattern(@PathVariable String urlPattern) {
        List<ApiMetadata> apis = apiMetadataService.getApisByUrlPattern(urlPattern);
        return new ResponseEntity<>(apis, HttpStatus.OK);
    }
    
    /**
     * 根据控制器类名获取API元数据
     */
    @GetMapping("/by-controller/{controllerClassName}")
    public ResponseEntity<List<ApiMetadata>> getApisByController(@PathVariable String controllerClassName) {
        List<ApiMetadata> apis = apiMetadataService.getApisByController(controllerClassName);
        return new ResponseEntity<>(apis, HttpStatus.OK);
    }
    
    /**
     * 根据标签获取API元数据
     */
    @GetMapping("/by-tag/{tag}")
    public ResponseEntity<List<ApiMetadata>> getApisByTag(@PathVariable String tag) {
        List<ApiMetadata> apis = apiMetadataService.getApisByTag(tag);
        return new ResponseEntity<>(apis, HttpStatus.OK);
    }
    
    /**
     * 刷新API元数据缓存
     */
    @PostMapping("/refresh")
    public ResponseEntity<Void> refreshApiMetadata() {
        apiMetadataService.refreshApiMetadata();
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    
    /**
     * 获取API元数据统计信息
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getApiStatistics() {
        Map<String, Object> statistics = apiMetadataService.getApiStatistics();
        return new ResponseEntity<>(statistics, HttpStatus.OK);
    }
    
    /**
     * 获取MCP格式的API元数据
     */
    @GetMapping("/mcp")
    public ResponseEntity<String> getApisAsMcpFormat() {
        String mcpFormat = apiMetadataService.getApisAsMcpFormat();
        return new ResponseEntity<>(mcpFormat, HttpStatus.OK);
    }
    
    /**
     * 执行API调用
     */
    @PostMapping("/execute/{apiId}")
    public ResponseEntity<Object> executeApiCall(@PathVariable String apiId, @RequestBody Map<String, Object> params) {
        try {
            Object result = apiMetadataService.executeApiCall(apiId, params);
            return new ResponseEntity<>(result, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(Map.of("error", e.getMessage()), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return new ResponseEntity<>(Map.of("error", "API调用失败: " + e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 获取MCP Server配置信息
     */
    @GetMapping("/mcp/server-info")
    public ResponseEntity<Map<String, Object>> getMcpServerInfo() {
        Map<String, Object> serverInfo = Map.of(
            "name", "Flink Monitor API MCP Server",
            "version", "1.0",
            "description", "Flink Monitor项目的MCP Server，用于为大模型提供API调用服务",
            "baseUrl", "/api",
            "apiCount", apiMetadataService.getAllApis().size(),
            "supports", List.of("api_discovery", "api_invocation", "semantic_analysis")
        );
        return new ResponseEntity<>(serverInfo, HttpStatus.OK);
    }
}
