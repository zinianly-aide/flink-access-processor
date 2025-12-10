package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.entity.OvertimeRecord;
import java.util.List;

public interface OvertimeRecordService {
    List<OvertimeRecord> findAll();
    List<OvertimeRecord> findByEmpId(Long empId);
    List<OvertimeRecord> findByDateRange(String startDate, String endDate);
}