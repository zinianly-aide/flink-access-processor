package com.example.flinkmonitorbackend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Date;

public class AbsenceRecord {
    @JsonProperty("id")
    private Long id;
    @JsonProperty("emp_id")
    private Long empId;
    @JsonProperty("shift_id")
    private Long shiftId;
    @JsonProperty("gap_start")
    private Date gapStart;
    @JsonProperty("gap_end")
    private Date gapEnd;
    @JsonProperty("gap_minutes")
    private Integer gapMinutes;
    @JsonProperty("calc_date")
    private Date calcDate;
    @JsonProperty("create_time")
    private Date createTime;
    @JsonProperty("reason")
    private String reason;
    @JsonProperty("image_url")
    private String imageUrl;
    @JsonProperty("preventive_measures")
    private String preventiveMeasures;
    @JsonProperty("flag")
    private Boolean flag;

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
    public Long getShiftId() {
        return shiftId;
    }
    public void setShiftId(Long shiftId) {
        this.shiftId = shiftId;
    }
    public Date getGapStart() {
        return gapStart;
    }
    public void setGapStart(Date gapStart) {
        this.gapStart = gapStart;
    }
    public Date getGapEnd() {
        return gapEnd;
    }
    public void setGapEnd(Date gapEnd) {
        this.gapEnd = gapEnd;
    }
    public Integer getGapMinutes() {
        return gapMinutes;
    }
    public void setGapMinutes(Integer gapMinutes) {
        this.gapMinutes = gapMinutes;
    }
    public Date getCalcDate() {
        return calcDate;
    }
    public void setCalcDate(Date calcDate) {
        this.calcDate = calcDate;
    }
    public Date getCreateTime() {
        return createTime;
    }
    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
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
    public Boolean getFlag() {
        return flag;
    }
    public void setFlag(Boolean flag) {
        this.flag = flag;
    }
}