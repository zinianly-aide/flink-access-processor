package com.example.flinkmonitorbackend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Date;

public class OvertimeRecord {
    @JsonProperty("id")
    private Long id;
    @JsonProperty("emp_id")
    private Long empId;
    @JsonProperty("work_date")
    private Date workDate;
    @JsonProperty("actual_hours")
    private Integer actualHours;
    @JsonProperty("regular_hours")
    private Integer regularHours;
    @JsonProperty("overtime_hours")
    private Integer overtimeHours;
    @JsonProperty("created_at")
    private Date createdAt;

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
    public Date getWorkDate() {
        return workDate;
    }
    public void setWorkDate(Date workDate) {
        this.workDate = workDate;
    }
    public Integer getActualHours() {
        return actualHours;
    }
    public void setActualHours(Integer actualHours) {
        this.actualHours = actualHours;
    }
    public Integer getRegularHours() {
        return regularHours;
    }
    public void setRegularHours(Integer regularHours) {
        this.regularHours = regularHours;
    }
    public Integer getOvertimeHours() {
        return overtimeHours;
    }
    public void setOvertimeHours(Integer overtimeHours) {
        this.overtimeHours = overtimeHours;
    }
    public Date getCreatedAt() {
        return createdAt;
    }
    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }
}