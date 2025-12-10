package com.example.flinkmonitorbackend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Date;

public class ExceptionalHoursIndicator {
    @JsonProperty("id")
    private Long id;
    @JsonProperty("indicator_name")
    private String indicatorName;
    @JsonProperty("indicator_type")
    private String indicatorType;
    @JsonProperty("threshold")
    private Integer threshold;
    @JsonProperty("description")
    private String description;
    @JsonProperty("is_active")
    private Boolean isActive;
    @JsonProperty("created_at")
    private Date createdAt;
    @JsonProperty("updated_at")
    private Date updatedAt;

    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
    public String getIndicatorName() {
        return indicatorName;
    }
    public void setIndicatorName(String indicatorName) {
        this.indicatorName = indicatorName;
    }
    public String getIndicatorType() {
        return indicatorType;
    }
    public void setIndicatorType(String indicatorType) {
        this.indicatorType = indicatorType;
    }
    public Integer getThreshold() {
        return threshold;
    }
    public void setThreshold(Integer threshold) {
        this.threshold = threshold;
    }
    public String getDescription() {
        return description;
    }
    public void setDescription(String description) {
        this.description = description;
    }
    public Boolean getIsActive() {
        return isActive;
    }
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
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