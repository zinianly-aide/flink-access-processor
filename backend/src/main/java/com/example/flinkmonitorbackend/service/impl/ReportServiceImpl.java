package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.entity.Report;
import com.example.flinkmonitorbackend.service.ReportService;
import com.example.flinkmonitorbackend.service.NaturalLanguageQueryService;
import com.example.flinkmonitorbackend.service.LlmService;
import com.example.flinkmonitorbackend.service.McpClientService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ReportServiceImpl implements ReportService {
    @Autowired
    private NaturalLanguageQueryService naturalLanguageQueryService;
    
    @Autowired
    private LlmService llmService;
    
    @Autowired
    private McpClientService mcpClientService;
    
    private final Map<Long, Report> reportHistory = new HashMap<>();
    private final AtomicLong reportIdGenerator = new AtomicLong(1);
    
    @Override
    public Report generateReport(String naturalLanguageQuery) {
        // 生成唯一ID
        Long reportId = reportIdGenerator.getAndIncrement();
        
        // 调用MCP客户端获取API元数据
        JsonNode mcpApiMetadata = mcpClientService.getMcpApiMetadata();
        
        // 执行自然语言查询，获取结果
        Map<String, Object> queryResult = naturalLanguageQueryService.executeNaturalLanguageQueryWithEvaluation(naturalLanguageQuery);
        
        // 从查询结果中提取数据
        List<Map<String, Object>> data = (List<Map<String, Object>>) queryResult.get("results");
        String sql = (String) queryResult.get("sql");
        String analysis = (String) queryResult.get("evaluation");
        
        // 生成报表
        Report report = new Report();
        report.setId(reportId);
        report.setQuery(naturalLanguageQuery);
        report.setSql(sql);
        report.setData(data);
        report.setAnalysis(analysis);
        report.setStatus("completed");
        report.setCreatedAt(new Date());
        report.setUpdatedAt(new Date());
        
        // 生成图表建议和配置
        generateChartConfig(report);
        
        // 保存到历史记录
        reportHistory.put(reportId, report);
        
        return report;
    }
    
    @Override
    public List<Report> getReportHistory() {
        return new ArrayList<>(reportHistory.values());
    }
    
    @Override
    public Report getReportById(Long reportId) {
        return reportHistory.get(reportId);
    }
    
    @Override
    public void deleteReport(Long reportId) {
        reportHistory.remove(reportId);
    }
    
    /**
     * 生成图表配置
     */
    private void generateChartConfig(Report report) {
        // 根据数据特征建议合适的图表类型
        String chartType = suggestChartType(report.getData());
        report.setChartType(chartType);
        
        // 生成图表配置
        Map<String, Object> chartConfig = generateChartConfig(report.getData(), chartType);
        report.setChartConfig(chartConfig);
    }
    
    /**
     * 根据数据特征建议合适的图表类型
     */
    private String suggestChartType(List<Map<String, Object>> data) {
        if (data == null || data.isEmpty()) {
            return "bar";
        }
        
        // 简单的图表类型建议逻辑
        // 如果数据只有一行，建议使用卡片或仪表盘
        if (data.size() == 1) {
            return "gauge";
        }
        
        // 否则建议使用柱状图或折线图
        return "bar";
    }
    
    /**
     * 根据数据和图表类型生成图表配置
     */
    private Map<String, Object> generateChartConfig(List<Map<String, Object>> data, String chartType) {
        Map<String, Object> chartConfig = new HashMap<>();
        
        // 简单的图表配置生成逻辑
        chartConfig.put("type", chartType);
        
        // 添加数据字段配置
        if (!data.isEmpty()) {
            // 获取所有字段名
            List<String> fields = new ArrayList<>(data.get(0).keySet());
            
            // 简单的X轴和Y轴配置
            if (fields.size() >= 2) {
                chartConfig.put("xField", fields.get(0));
                chartConfig.put("yField", fields.get(1));
            }
        }
        
        return chartConfig;
    }
}