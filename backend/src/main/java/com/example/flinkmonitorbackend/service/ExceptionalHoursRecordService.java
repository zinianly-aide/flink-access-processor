package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.entity.ExceptionalHoursRecord;
import java.util.List;

public interface ExceptionalHoursRecordService {
    List<ExceptionalHoursRecord> findAll();
    List<ExceptionalHoursRecord> findByStatus(String status);
    List<ExceptionalHoursRecord> findByEmpId(Long empId);
    List<ExceptionalHoursRecord> findByIndicatorType(String indicatorType);
    ExceptionalHoursRecord findById(Long id);
    void update(ExceptionalHoursRecord record);
    void submitReason(Long recordId, String reason, String imageUrl, String preventiveMeasures);
    void approveRecord(Long recordId, String approvedBy);
}