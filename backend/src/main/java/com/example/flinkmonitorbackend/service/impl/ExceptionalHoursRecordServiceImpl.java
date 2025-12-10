package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.entity.ExceptionalHoursRecord;
import com.example.flinkmonitorbackend.mapper.ExceptionalHoursRecordMapper;
import com.example.flinkmonitorbackend.service.ExceptionalHoursRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Date;
import java.util.List;

@Service
public class ExceptionalHoursRecordServiceImpl implements ExceptionalHoursRecordService {
    @Autowired
    private ExceptionalHoursRecordMapper exceptionalHoursRecordMapper;

    @Override
    public List<ExceptionalHoursRecord> findAll() {
        return exceptionalHoursRecordMapper.findAll();
    }

    @Override
    public List<ExceptionalHoursRecord> findByStatus(String status) {
        return exceptionalHoursRecordMapper.findByStatus(status);
    }

    @Override
    public List<ExceptionalHoursRecord> findByEmpId(Long empId) {
        return exceptionalHoursRecordMapper.findByEmpId(empId);
    }

    @Override
    public List<ExceptionalHoursRecord> findByIndicatorType(String indicatorType) {
        return exceptionalHoursRecordMapper.findByIndicatorType(indicatorType);
    }

    @Override
    public ExceptionalHoursRecord findById(Long id) {
        return exceptionalHoursRecordMapper.findById(id);
    }

    @Override
    public void update(ExceptionalHoursRecord record) {
        exceptionalHoursRecordMapper.update(record);
    }

    @Override
    public void submitReason(Long recordId, String reason, String imageUrl, String preventiveMeasures) {
        ExceptionalHoursRecord record = exceptionalHoursRecordMapper.findById(recordId);
        if (record != null) {
            record.setReason(reason);
            record.setImageUrl(imageUrl);
            record.setPreventiveMeasures(preventiveMeasures);
            record.setStatus("processed");
            exceptionalHoursRecordMapper.update(record);
        }
    }

    @Override
    public void approveRecord(Long recordId, String approvedBy) {
        ExceptionalHoursRecord record = exceptionalHoursRecordMapper.findById(recordId);
        if (record != null) {
            record.setStatus("approved");
            record.setApprovedBy(approvedBy);
            record.setApprovedAt(new Date());
            exceptionalHoursRecordMapper.update(record);
        }
    }
}