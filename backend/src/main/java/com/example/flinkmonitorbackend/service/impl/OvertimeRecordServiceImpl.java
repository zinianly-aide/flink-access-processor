package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.entity.OvertimeRecord;
import com.example.flinkmonitorbackend.mapper.OvertimeRecordMapper;
import com.example.flinkmonitorbackend.service.OvertimeRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class OvertimeRecordServiceImpl implements OvertimeRecordService {
    @Autowired
    private OvertimeRecordMapper overtimeRecordMapper;

    @Override
    public List<OvertimeRecord> findAll() {
        return overtimeRecordMapper.findAll();
    }

    @Override
    public List<OvertimeRecord> findByEmpId(Long empId) {
        return overtimeRecordMapper.findByEmpId(empId);
    }

    @Override
    public List<OvertimeRecord> findByDateRange(String startDate, String endDate) {
        return overtimeRecordMapper.findByDateRange(startDate, endDate);
    }
}