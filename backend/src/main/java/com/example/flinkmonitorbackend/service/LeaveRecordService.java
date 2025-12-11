package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.entity.LeaveRecord;

import java.util.List;
import java.util.Map;

public interface LeaveRecordService {
    List<LeaveRecord> findAll();
    List<LeaveRecord> findByEmpId(Long empId);
    List<LeaveRecord> findByDateRange(String startDate, String endDate);
    List<LeaveRecord> findByOrgId(Long orgId);
    List<Map<String, Object>> getDeptLeaveSummary();
    List<Map<String, Object>> getDeptNetOvertimeSummary();
}