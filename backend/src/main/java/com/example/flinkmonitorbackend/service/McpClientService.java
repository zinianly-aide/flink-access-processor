package com.example.flinkmonitorbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class McpClientService {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String mcpBaseUrl;
    
    public McpClientService() {
        // 配置RestTemplate，增加超时设置
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(60000); // 60秒连接超时
        factory.setReadTimeout(60000); // 60秒读取超时
        this.restTemplate = new RestTemplate(factory);
        
        this.objectMapper = new ObjectMapper();
        // 使用本地MCP服务器地址，实际部署时可以从配置中读取
        this.mcpBaseUrl = "http://localhost:8082/api/api-metadata";
    }
    
    /**
     * 获取MCP格式的API元数据
     */
    public JsonNode getMcpApiMetadata() {
        try {
            String url = mcpBaseUrl + "/mcp";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            System.err.println("获取MCP API元数据失败: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
    
    /**
     * 执行API调用
     */
    public Object executeApiCall(String apiId, Map<String, Object> params) {
        try {
            System.out.println("开始执行MCP API调用: " + apiId);
            System.out.println("调用参数: " + params);
            
            String url = mcpBaseUrl + "/execute/" + apiId;
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            headers.set("Accept", "application/json");
            
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(params, headers);
            ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.POST, requestEntity, Object.class);
            
            System.out.println("MCP API调用成功，返回状态: " + response.getStatusCode());
            System.out.println("返回结果: " + response.getBody());
            
            return response.getBody();
        } catch (Exception e) {
            System.err.println("MCP API调用失败: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("MCP API调用失败: " + e.getMessage(), e);
        }
    }
    
    /**
     * 获取MCP服务器信息
     */
    public Map<String, Object> getMcpServerInfo() {
        try {
            String url = mcpBaseUrl + "/mcp/server-info";
            ResponseEntity<? extends Map> response = restTemplate.getForEntity(url, Map.class);
            return (Map<String, Object>) response.getBody();
        } catch (Exception e) {
            System.err.println("获取MCP服务器信息失败: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
    
    /**
     * 搜索匹配的API
     */
    public List<Map<String, Object>> searchMatchingApis(String query) {
        try {
            // 获取所有API元数据
            JsonNode apiMetadata = getMcpApiMetadata();
            if (apiMetadata == null || !apiMetadata.has("apis")) {
                return new ArrayList<>();
            }
            
            List<Map<String, Object>> matchingApis = new ArrayList<>();
            JsonNode apis = apiMetadata.get("apis");
            
            // 遍历所有API，查找匹配的API
            for (JsonNode api : apis) {
                String description = api.has("description") ? api.get("description").asText().toLowerCase() : "";
                List<String> tags = new ArrayList<>();
                if (api.has("tags")) {
                    JsonNode apiTags = api.get("tags");
                    if (apiTags.isArray()) {
                        for (JsonNode tag : apiTags) {
                            tags.add(tag.asText().toLowerCase());
                        }
                    }
                }
                
                // 简单的关键词匹配
                String normalizedQuery = query.toLowerCase();
                if (description.contains(normalizedQuery) || tags.stream().anyMatch(tag -> tag.contains(normalizedQuery))) {
                    Map<String, Object> apiMap = objectMapper.convertValue(api, Map.class);
                    matchingApis.add(apiMap);
                }
            }
            
            return matchingApis;
        } catch (Exception e) {
            System.err.println("搜索匹配的API失败: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    /**
     * 增强的API调用，支持智能参数映射和结果处理
     */
    public Object executeEnhancedApiCall(String apiId, Map<String, Object> params) {
        try {
            // 搜索匹配的API
            List<Map<String, Object>> matchingApis = searchMatchingApis(apiId);
            if (!matchingApis.isEmpty()) {
                // 获取第一个匹配的API
                Map<String, Object> apiInfo = matchingApis.get(0);
                String actualApiId = apiInfo.getOrDefault("id", apiId).toString();
                System.out.println("使用匹配的API ID: " + actualApiId + " 替代原始API ID: " + apiId);
                
                // 执行API调用
                return executeApiCall(actualApiId, params);
            }
            
            // 如果没有匹配的API，尝试直接调用原始API ID
            return executeApiCall(apiId, params);
        } catch (Exception e) {
            System.err.println("增强的API调用失败: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("增强的API调用失败: " + e.getMessage(), e);
        }
    }
}