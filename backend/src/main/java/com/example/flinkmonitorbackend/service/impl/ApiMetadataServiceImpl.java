package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.entity.ApiMetadata;
import com.example.flinkmonitorbackend.service.ApiMetadataService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.lang.reflect.Parameter;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * API元数据服务实现类，用于获取和管理项目中的API信息
 */
@Service
public class ApiMetadataServiceImpl implements ApiMetadataService {
    
    @Autowired
    private RequestMappingHandlerMapping requestMappingHandlerMapping;
    
    @Autowired
    private ApplicationContext applicationContext;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    // API元数据缓存
    private final Map<String, ApiMetadata> apiMetadataCache = new ConcurrentHashMap<>();
    
    // 最后刷新时间
    private long lastRefreshTime = 0;
    
    // 刷新间隔（毫秒）
    private static final long REFRESH_INTERVAL = 60 * 1000; // 1分钟
    
    /**
     * 初始化API元数据缓存
     */
    public ApiMetadataServiceImpl() {
        // 初始化时刷新一次API元数据
        // 注意：在构造函数中调用refreshApiMetadata()可能会导致循环依赖问题
        // 因此将刷新操作延迟到第一次使用时
    }
    
    @Override
    public List<ApiMetadata> getAllApis() {
        // 检查是否需要刷新缓存
        if (System.currentTimeMillis() - lastRefreshTime > REFRESH_INTERVAL || apiMetadataCache.isEmpty()) {
            refreshApiMetadata();
        }
        
        return new ArrayList<>(apiMetadataCache.values());
    }
    
    @Override
    public ApiMetadata getApiById(String apiId) {
        // 检查是否需要刷新缓存
        if (System.currentTimeMillis() - lastRefreshTime > REFRESH_INTERVAL || apiMetadataCache.isEmpty()) {
            refreshApiMetadata();
        }
        
        return apiMetadataCache.get(apiId);
    }
    
    @Override
    public List<ApiMetadata> getApisByHttpMethod(String httpMethod) {
        // 检查是否需要刷新缓存
        if (System.currentTimeMillis() - lastRefreshTime > REFRESH_INTERVAL || apiMetadataCache.isEmpty()) {
            refreshApiMetadata();
        }
        
        return apiMetadataCache.values().stream()
                .filter(api -> httpMethod.equalsIgnoreCase(api.httpMethod))
                .collect(Collectors.toList());
    }
    
    @Override
    public List<ApiMetadata> getApisByUrlPattern(String urlPattern) {
        // 检查是否需要刷新缓存
        if (System.currentTimeMillis() - lastRefreshTime > REFRESH_INTERVAL || apiMetadataCache.isEmpty()) {
            refreshApiMetadata();
        }
        
        return apiMetadataCache.values().stream()
                .filter(api -> api.url.contains(urlPattern))
                .collect(Collectors.toList());
    }
    
    @Override
    public List<ApiMetadata> getApisByController(String controllerClassName) {
        // 检查是否需要刷新缓存
        if (System.currentTimeMillis() - lastRefreshTime > REFRESH_INTERVAL || apiMetadataCache.isEmpty()) {
            refreshApiMetadata();
        }
        
        return apiMetadataCache.values().stream()
                .filter(api -> controllerClassName.equals(api.controllerClassName))
                .collect(Collectors.toList());
    }
    
    @Override
    public List<ApiMetadata> getApisByTag(String tag) {
        // 检查是否需要刷新缓存
        if (System.currentTimeMillis() - lastRefreshTime > REFRESH_INTERVAL || apiMetadataCache.isEmpty()) {
            refreshApiMetadata();
        }
        
        return apiMetadataCache.values().stream()
                .filter(api -> api.tags != null && api.tags.contains(tag))
                .collect(Collectors.toList());
    }
    
    @Override
    public synchronized void refreshApiMetadata() {
        // 清空缓存
        apiMetadataCache.clear();
        
        System.out.println("=== 开始刷新API元数据 ===");
        
        // 获取所有请求映射
        Map<RequestMappingInfo, HandlerMethod> handlerMethods = requestMappingHandlerMapping.getHandlerMethods();
        
        System.out.println("获取到的请求映射数量: " + handlerMethods.size());
        
        // 遍历所有请求映射，生成API元数据
        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : handlerMethods.entrySet()) {
            RequestMappingInfo requestMappingInfo = entry.getKey();
            HandlerMethod handlerMethod = entry.getValue();
            
            System.out.println("处理请求映射: " + requestMappingInfo);
            
            // 获取URL路径
            String url = "";
            try {
                // 直接使用RequestMappingInfo的toString()方法提取路径
                String requestMappingString = requestMappingInfo.toString();
                System.out.println("请求映射字符串: " + requestMappingString);
                
                // 使用字符串处理方法提取路径模式
                String pathStart = "[";
                int startIndex = requestMappingString.indexOf(pathStart);
                if (startIndex == -1) {
                    System.out.println("无法提取路径模式，跳过该请求映射");
                    continue;
                }
                int endIndex = requestMappingString.indexOf("]", startIndex);
                if (endIndex == -1) {
                    System.out.println("无法提取路径模式，跳过该请求映射");
                    continue;
                }
                url = requestMappingString.substring(startIndex + 1, endIndex);
                System.out.println("获取到URL: " + url);
                
                // 处理多个路径的情况，只取第一个
                if (url.contains(",")) {
                    url = url.split(",")[0].trim();
                    System.out.println("处理多个路径，只取第一个: " + url);
                }
                
                // 移除可能的空格
                url = url.trim();
            } catch (Exception e) {
                System.out.println("提取URL路径出错: " + e.getMessage());
                continue;
            }
            
            // 获取HTTP方法
            Set<String> httpMethods = new HashSet<>();
            try {
                httpMethods = requestMappingInfo.getMethodsCondition().getMethods().stream()
                        .map(Enum::name)
                        .collect(Collectors.toSet());
            } catch (Exception e) {
                System.out.println("获取HTTP方法出错: " + e.getMessage());
            }
            
            if (httpMethods.isEmpty()) {
                httpMethods.add("GET"); // 默认GET方法
                System.out.println("使用默认GET方法");
            }
            System.out.println("获取到HTTP方法: " + httpMethods);
            
            // 获取控制器类名和方法名
            String controllerClassName = handlerMethod.getBeanType().getSimpleName();
            String methodName = handlerMethod.getMethod().getName();
            System.out.println("控制器类名: " + controllerClassName + ", 方法名: " + methodName);
            
            // 获取方法参数信息
            List<ApiMetadata.ApiParameter> parameters = new ArrayList<>();
            for (Parameter param : handlerMethod.getMethod().getParameters()) {
                ApiMetadata.ApiParameter apiParam = new ApiMetadata.ApiParameter();
                apiParam.name = param.getName();
                apiParam.type = param.getType().getSimpleName();
                apiParam.in = "QUERY"; // 默认QUERY，实际应根据注解判断
                apiParam.required = false; // 默认非必填，实际应根据注解判断
                apiParam.description = "";
                apiParam.defaultValue = "";
                parameters.add(apiParam);
            }
            System.out.println("获取到参数数量: " + parameters.size());
            
            // 获取响应类型
            String responseType = handlerMethod.getMethod().getReturnType().getSimpleName();
            System.out.println("响应类型: " + responseType);
            
            // 生成API ID
            String apiId = generateApiId(url, httpMethods.iterator().next());
            System.out.println("生成的API ID: " + apiId);
            
            // 创建API元数据
            ApiMetadata apiMetadata = new ApiMetadata();
            apiMetadata.id = apiId;
            apiMetadata.url = url;
            apiMetadata.httpMethod = httpMethods.iterator().next();
            apiMetadata.description = generateApiDescription(controllerClassName, methodName);
            apiMetadata.controllerClassName = controllerClassName;
            apiMetadata.methodName = methodName;
            apiMetadata.parameters = parameters;
            apiMetadata.responseType = responseType;
            apiMetadata.requestBodyType = "";
            apiMetadata.tags = extractTags(controllerClassName);
            apiMetadata.status = "ACTIVE";
            apiMetadata.createdAt = Instant.now().toEpochMilli();
            apiMetadata.updatedAt = Instant.now().toEpochMilli();
            apiMetadata.customProperties = new HashMap<>();
            
            // 缓存API元数据
            apiMetadataCache.put(apiId, apiMetadata);
            System.out.println("成功添加API元数据: " + apiId);
        }
        
        // 更新最后刷新时间
        lastRefreshTime = System.currentTimeMillis();
        
        System.out.println("=== API元数据刷新完成，共添加 " + apiMetadataCache.size() + " 个API ===");
    }
    
    @Override
    public Map<String, Object> getApiStatistics() {
        // 检查是否需要刷新缓存
        if (System.currentTimeMillis() - lastRefreshTime > REFRESH_INTERVAL || apiMetadataCache.isEmpty()) {
            refreshApiMetadata();
        }
        
        Map<String, Object> statistics = new HashMap<>();
        
        // 总API数量
        statistics.put("totalApis", apiMetadataCache.size());
        
        // 按HTTP方法统计
        Map<String, Long> httpMethodStats = new HashMap<>();
        for (ApiMetadata api : apiMetadataCache.values()) {
            httpMethodStats.put(api.httpMethod, httpMethodStats.getOrDefault(api.httpMethod, 0L) + 1);
        }
        statistics.put("httpMethodStats", httpMethodStats);
        
        // 按控制器统计
        Map<String, Long> controllerStats = new HashMap<>();
        for (ApiMetadata api : apiMetadataCache.values()) {
            controllerStats.put(api.controllerClassName, controllerStats.getOrDefault(api.controllerClassName, 0L) + 1);
        }
        statistics.put("controllerStats", controllerStats);
        
        // 按标签统计
        Map<String, Long> tagStats = new HashMap<>();
        for (ApiMetadata api : apiMetadataCache.values()) {
            if (api.tags != null) {
                for (String tag : api.tags) {
                    tagStats.put(tag, tagStats.getOrDefault(tag, 0L) + 1);
                }
            }
        }
        statistics.put("tagStats", tagStats);
        
        // 最后刷新时间
        statistics.put("lastRefreshTime", lastRefreshTime);
        
        return statistics;
    }
    
    @Override
    public String getApisAsMcpFormat() {
        // 检查是否需要刷新缓存
        if (System.currentTimeMillis() - lastRefreshTime > REFRESH_INTERVAL || apiMetadataCache.isEmpty()) {
            refreshApiMetadata();
        }
        
        try {
            // 创建MCP格式的API元数据
            Map<String, Object> mcpFormat = new HashMap<>();
            mcpFormat.put("version", "1.0");
            mcpFormat.put("name", "Flink Monitor API");
            mcpFormat.put("description", "Flink Monitor项目的RESTful API");
            mcpFormat.put("baseUrl", "/api");
            mcpFormat.put("apis", new ArrayList<>(apiMetadataCache.values()));
            mcpFormat.put("statistics", getApiStatistics());
            
            // 转换为JSON字符串
            return objectMapper.writeValueAsString(mcpFormat);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("转换API元数据为MCP格式失败: " + e.getMessage(), e);
        }
    }
    
    @Override
    public Object executeApiCall(String apiId, Map<String, Object> params) {
        // 检查API是否存在
        ApiMetadata apiMetadata = getApiById(apiId);
        if (apiMetadata == null) {
            throw new IllegalArgumentException("API不存在: " + apiId);
        }
        
        // 实际实现应根据API元数据执行HTTP请求或直接调用方法
        try {
            // 获取应用上下文
            Object controller = applicationContext.getBean(removeControllerSuffix(apiMetadata.controllerClassName + "Controller"));
            
            // 直接调用控制器方法获取结果
            return invokeControllerMethod(controller, apiMetadata.methodName, params);
        } catch (Exception e) {
            throw new RuntimeException("API调用失败: " + e.getMessage(), e);
        }
    }
    
    /**
     * 调用控制器方法获取结果
     */
    private Object invokeControllerMethod(Object controller, String methodName, Map<String, Object> params) {
        // 根据方法名和参数调用控制器方法
        try {
            // 获取方法对象
            java.lang.reflect.Method method;
            if (methodName.contains("Get") || methodName.contains("get")) {
                // GET方法通常不需要参数或只需要路径参数
                method = controller.getClass().getMethod(methodName);
                return method.invoke(controller);
            } else {
                // POST/PUT方法通常需要请求体参数
                method = controller.getClass().getMethod(methodName, Map.class);
                return method.invoke(controller, params);
            }
        } catch (NoSuchMethodException e) {
            // 尝试根据业务规则匹配其他方法
            try {
                // 尝试匹配包含参数的方法
                method = controller.getClass().getMethod(methodName, String.class);
                // 获取id参数
                String id = params.getOrDefault("id", params.keySet().iterator().next()).toString();
                return method.invoke(controller, id);
            } catch (Exception ex) {
                throw new RuntimeException("无法找到匹配的方法: " + methodName, ex);
            }
        } catch (Exception e) {
            throw new RuntimeException("调用控制器方法失败: " + methodName, e);
        }
    }
    
    /**
     * 生成API ID
     */
    private String generateApiId(String url, String httpMethod) {
        // 移除斜杠和特殊字符，生成唯一ID
        String normalizedUrl = url.replaceAll("[/\\{}]", "_");
        return httpMethod.toLowerCase() + "_" + normalizedUrl.toLowerCase() + "_" + System.currentTimeMillis();
    }
    
    /**
     * 生成API描述
     */
    private String generateApiDescription(String controllerClassName, String methodName) {
        // 根据控制器类名和方法名生成描述
        StringBuilder description = new StringBuilder();
        
        // 移除Controller后缀
        String controllerName = removeControllerSuffix(controllerClassName);
        // 转换为驼峰命名
        controllerName = camelCaseToWords(controllerName);
        
        // 转换方法名为驼峰命名
        String methodDescription = camelCaseToWords(methodName);
        
        return description.append(controllerName).append(" - ").append(methodDescription).toString();
    }
    
    /**
     * 移除Controller后缀
     */
    private String removeControllerSuffix(String controllerClassName) {
        if (controllerClassName.endsWith("Controller")) {
            return controllerClassName.substring(0, controllerClassName.length() - 10);
        }
        return controllerClassName;
    }
    
    /**
     * 提取标签
     */
    private List<String> extractTags(String controllerClassName) {
        // 根据控制器类名提取标签
        List<String> tags = new ArrayList<>();
        tags.add(controllerClassName);
        
        // 可以根据实际业务需求添加更多标签
        if (controllerClassName.contains("Employee")) {
            tags.add("员工管理");
        } else if (controllerClassName.contains("Record")) {
            tags.add("记录管理");
        } else if (controllerClassName.contains("Alert")) {
            tags.add("告警管理");
        } else if (controllerClassName.contains("Organization")) {
            tags.add("组织管理");
        }
        
        return tags;
    }
    
    /**
     * 将驼峰命名转换为单词
     */
    private String camelCaseToWords(String camelCase) {
        if (camelCase == null || camelCase.isEmpty()) {
            return camelCase;
        }
        
        StringBuilder result = new StringBuilder();
        result.append(Character.toUpperCase(camelCase.charAt(0)));
        
        for (int i = 1; i < camelCase.length(); i++) {
            char c = camelCase.charAt(i);
            if (Character.isUpperCase(c)) {
                result.append(" ");
                result.append(c);
            } else {
                result.append(c);
            }
        }
        
        return result.toString();
    }
}
