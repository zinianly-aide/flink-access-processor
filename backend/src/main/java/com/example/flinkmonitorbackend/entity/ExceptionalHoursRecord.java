package com.example.flinkmonitorbackend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Date;

public class ExceptionalHoursRecord {
    @JsonProperty("id")
    private Long id;
    @JsonProperty("emp_id")
    private Long empId;
    @JsonProperty("indicator_id")
    private Long indicatorId;
    @JsonProperty("indicator_name")
    private String indicatorName;
    @JsonProperty("indicator_type")
    private String indicatorType;
    @JsonProperty("actual_value")
    private Integer actualValue;
    @JsonProperty("threshold")
    private Integer threshold;
    @JsonProperty("period_start")
    private Date periodStart;
    @JsonProperty("period_end")
    private Date periodEnd;
    @JsonProperty("status")
    private String status;
    @JsonProperty("reason")
    private String reason;
    @JsonProperty("image_url")
    private String imageUrl;
    @JsonProperty("preventive_measures")
    private String preventiveMeasures;
    @JsonProperty("approved_by")
    private String approvedBy;
    @JsonProperty("approved_at")
    private Date approvedAt;
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
    public Long getEmpId() {
        return empId;
    }
    public void setEmpId(Long empId) {
        this.empId = empId;
    }
    public Long getIndicatorId() {
        return indicatorId;
    }
    public void setIndicatorId(Long indicatorId) {
        this.indicatorId = indicatorId;
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
    public Integer getActualValue() {
        return actualValue;
    }
    public void setActualValue(Integer actualValue) {
        this.actualValue = actualValue;
    }
    public Integer getThreshold() {
        return threshold;
    }
    public void setThreshold(Integer threshold) {
        this.threshold = threshold;
    }
    public Date getPeriodStart() {
        return periodStart;
    }
    public void setPeriodStart(Date periodStart) {
        this.periodStart = periodStart;
    }
    public Date getPeriodEnd() {
        return periodEnd;
    }
    public void setPeriodEnd(Date periodEnd) {
        this.periodEnd = periodEnd;
    }
    public String getStatus() {
        return status;
    }
    public void setStatus(String status) {
        this.status = status;
    }
    public String getReason() {
        return reason;
    }
    public void setReason(String reason) {
        this.reason = reason;
    }
    public String getImageUrl() {
        return imageUrl;
    }
    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
    public String getPreventiveMeasures() {
        return preventiveMeasures;
    }
    public void setPreventiveMeasures(String preventiveMeasures) {
        this.preventiveMeasures = preventiveMeasures;
    }
    public String getApprovedBy() {
        return approvedBy;
    }
    public void setApprovedBy(String approvedBy) {
        this.approvedBy = approvedBy;
    }
    public Date getApprovedAt() {
        return approvedAt;
    }
    public void setApprovedAt(Date approvedAt) {
        this.approvedAt = approvedAt;
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