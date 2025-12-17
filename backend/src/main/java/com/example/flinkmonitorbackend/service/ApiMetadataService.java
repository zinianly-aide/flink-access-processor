package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.entity.ApiMetadata;

import java.util.List;
import java.util.Map;

/**
 * API元数据服务接口，用于获取和管理项目中的API信息
 */
public interface ApiMetadataService {
    
    /**
     * 获取所有API元数据
     * 
     * @return 所有API元数据列表
     */
    List<ApiMetadata> getAllApis();
    
    /**
     * 根据API ID获取API元数据
     * 
     * @param apiId API的唯一标识符
     * @return API元数据
     */
    ApiMetadata getApiById(String apiId);
    
    /**
     * 根据HTTP方法获取API元数据
     * 
     * @param httpMethod HTTP方法，如GET、POST、PUT、DELETE等
     * @return API元数据列表
     */
    List<ApiMetadata> getApisByHttpMethod(String httpMethod);
    
    /**
     * 根据URL路径模式获取API元数据
     * 
     * @param urlPattern URL路径模式，如/employees/*
     * @return API元数据列表
     */
    List<ApiMetadata> getApisByUrlPattern(String urlPattern);
    
    /**
     * 根据控制器类名获取API元数据
     * 
     * @param controllerClassName 控制器类名
     * @return API元数据列表
     */
    List<ApiMetadata> getApisByController(String controllerClassName);
    
    /**
     * 根据标签获取API元数据
     * 
     * @param tag 标签名称
     * @return API元数据列表
     */
    List<ApiMetadata> getApisByTag(String tag);
    
    /**
     * 刷新API元数据缓存
     */
    void refreshApiMetadata();
    
    /**
     * 获取API元数据的统计信息
     * 
     * @return API元数据统计信息
     */
    Map<String, Object> getApiStatistics();
    
    /**
     * 将API元数据转换为MCP格式
     * 
     * @return MCP格式的API元数据
     */
    String getApisAsMcpFormat();
    
    /**
     * 执行API调用
     * 
     * @param apiId API的唯一标识符
     * @param params API调用参数
     * @return API调用结果
     */
    Object executeApiCall(String apiId, Map<String, Object> params);
}
