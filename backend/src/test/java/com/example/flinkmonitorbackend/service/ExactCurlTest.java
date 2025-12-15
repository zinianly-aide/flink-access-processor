package com.example.flinkmonitorbackend.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.Map;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
class ExactCurlTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void testExactCurlRequest() {
        // 模拟用户的curl请求：curl -X POST -H "Content-Type: application/json" -d '{"query":"当前时间"}' http://localhost:8082/api/natural-language-query/translate-to-sql
        String url = "http://localhost:8082/api/natural-language-query/translate-to-sql";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");
        
        String requestBody = "{\"query\":\"当前时间\"}";
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
        
        System.out.println("Sending exact curl request:");
        System.out.println("URL: " + url);
        System.out.println("Headers: " + headers);
        System.out.println("Body: " + requestBody);
        
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
        
        System.out.println("\nResponse:");
        System.out.println("Status: " + response.getStatusCode());
        System.out.println("Body: " + response.getBody());
        
        // 测试其他类似查询
        String[] queries = {
            "当前时间",
            "查询当前时间",
            "显示当前时间",
            "获取当前时间",
            "当前日期时间"
        };
        
        for (String query : queries) {
            System.out.println("\n\nTesting query: " + query);
            requestBody = String.format("{\"query\":\"%s\"}", query);
            entity = new HttpEntity<>(requestBody, headers);
            response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            System.out.println("Response: " + response.getBody());
        }
    }
}
