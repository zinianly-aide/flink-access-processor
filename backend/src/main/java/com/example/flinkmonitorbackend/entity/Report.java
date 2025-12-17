package com.example.flinkmonitorbackend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Date;
import java.util.List;
import java.util.Map;

public class Report {
    @JsonProperty("id")
    private Long id;
    
    @JsonProperty("query")
    private String query;
    
    @JsonProperty("sql")
    private String sql;
    
    @JsonProperty("data")
    private List<Map<String, Object>> data;
    
    @JsonProperty("analysis")
    private String analysis;
    
    @JsonProperty("chart_type")
    private String chartType;
    
    @JsonProperty("chart_config")
    private Map<String, Object> chartConfig;
    
    @JsonProperty("status")
    private String status;
    
    @JsonProperty("created_at")
    private Date createdAt;
    
    @JsonProperty("updated_at")
    private Date updatedAt;
    
    // Getters and setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getQuery() {
        return query;
    }
    
    public void setQuery(String query) {
        this.query = query;
    }
    
    public String getSql() {
        return sql;
    }
    
    public void setSql(String sql) {
        this.sql = sql;
    }
    
    public List<Map<String, Object>> getData() {
        return data;
    }
    
    public void setData(List<Map<String, Object>> data) {
        this.data = data;
    }
    
    public String getAnalysis() {
        return analysis;
    }
    
    public void setAnalysis(String analysis) {
        this.analysis = analysis;
    }
    
    public String getChartType() {
        return chartType;
    }
    
    public void setChartType(String chartType) {
        this.chartType = chartType;
    }
    
    public Map<String, Object> getChartConfig() {
        return chartConfig;
    }
    
    public void setChartConfig(Map<String, Object> chartConfig) {
        this.chartConfig = chartConfig;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public Date getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }
    
    public Date getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }
}