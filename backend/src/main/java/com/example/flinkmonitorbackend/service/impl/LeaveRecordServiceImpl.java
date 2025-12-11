package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.entity.LeaveRecord;
import com.example.flinkmonitorbackend.mapper.LeaveRecordMapper;
import com.example.flinkmonitorbackend.service.LeaveRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class LeaveRecordServiceImpl implements LeaveRecordService {
    @Autowired
    private LeaveRecordMapper leaveRecordMapper;

    @Override
    public List<LeaveRecord> findAll() {
        return leaveRecordMapper.findAll();
    }

    @Override
    public List<LeaveRecord> findByEmpId(Long empId) {
        return leaveRecordMapper.findByEmpId(empId);
    }

    @Override
    public List<LeaveRecord> findByDateRange(String startDate, String endDate) {
        return leaveRecordMapper.findByDateRange(startDate, endDate);
    }

    @Override
    public List<LeaveRecord> findByOrgId(Long orgId) {
        return leaveRecordMapper.findByOrgId(orgId);
    }

    @Override
    public List<Map<String, Object>> getDeptLeaveSummary() {
        return leaveRecordMapper.getDeptLeaveSummary();
    }

    @Override
    public List<Map<String, Object>> getDeptNetOvertimeSummary() {
        return leaveRecordMapper.getDeptNetOvertimeSummary();
    }
}