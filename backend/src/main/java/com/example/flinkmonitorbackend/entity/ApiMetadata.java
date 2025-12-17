package com.example.flinkmonitorbackend.entity;

import java.util.List;
import java.util.Map;

/**
 * API元数据实体类，用于存储API的相关信息
 */
public class ApiMetadata {
    
    /**
     * API的唯一标识符
     */
    public String id;
    
    /**
     * API的URL路径
     */
    public String url;
    
    /**
     * HTTP方法，如GET、POST、PUT、DELETE等
     */
    public String httpMethod;
    
    /**
     * API的描述信息
     */
    public String description;
    
    /**
     * API所属的控制器类名
     */
    public String controllerClassName;
    
    /**
     * API所属的控制器方法名
     */
    public String methodName;
    
    /**
     * API的请求参数信息
     */
    public List<ApiParameter> parameters;
    
    /**
     * API的响应类型
     */
    public String responseType;
    
    /**
     * API的请求体类型
     */
    public String requestBodyType;
    
    /**
     * API的标签，用于分类
     */
    public List<String> tags;
    
    /**
     * API的状态，如ACTIVE、DEPRECATED等
     */
    public String status;
    
    /**
     * API的创建时间
     */
    public long createdAt;
    
    /**
     * API的更新时间
     */
    public long updatedAt;
    
    /**
     * 其他自定义属性
     */
    public Map<String, Object> customProperties;
    
    /**
     * 默认构造函数
     */
    public ApiMetadata() {
    }
    
    /**
     * 全参构造函数
     */
    public ApiMetadata(String id, String url, String httpMethod, String description, 
                      String controllerClassName, String methodName, List<ApiParameter> parameters, 
                      String responseType, String requestBodyType, List<String> tags, 
                      String status, long createdAt, long updatedAt, Map<String, Object> customProperties) {
        this.id = id;
        this.url = url;
        this.httpMethod = httpMethod;
        this.description = description;
        this.controllerClassName = controllerClassName;
        this.methodName = methodName;
        this.parameters = parameters;
        this.responseType = responseType;
        this.requestBodyType = requestBodyType;
        this.tags = tags;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.customProperties = customProperties;
    }
    
    /**
     * API参数实体类
     */
    public static class ApiParameter {
        
        /**
         * 参数名
         */
        public String name;
        
        /**
         * 参数类型，如String、Integer、Long等
         */
        public String type;
        
        /**
         * 参数的位置，如PATH、QUERY、HEADER、BODY等
         */
        public String in;
        
        /**
         * 是否必填
         */
        public boolean required;
        
        /**
         * 参数的描述信息
         */
        public String description;
        
        /**
         * 参数的默认值
         */
        public String defaultValue;
        
        /**
         * 默认构造函数
         */
        public ApiParameter() {
        }
        
        /**
         * 全参构造函数
         */
        public ApiParameter(String name, String type, String in, boolean required, 
                          String description, String defaultValue) {
            this.name = name;
            this.type = type;
            this.in = in;
            this.required = required;
            this.description = description;
            this.defaultValue = defaultValue;
        }
    }
}
