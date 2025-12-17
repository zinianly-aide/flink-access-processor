package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.dto.PageRequest;
import com.example.flinkmonitorbackend.dto.PageResponse;
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

    @Override
    public PageResponse<OvertimeRecord> findByPage(PageRequest pageRequest) {
        // 计算分页参数
        int offset = (pageRequest.getPage() - 1) * pageRequest.getPageSize();
        int limit = pageRequest.getPageSize();
        
        // 查询数据列表
        List<OvertimeRecord> records = overtimeRecordMapper.findByPage(pageRequest.getSearch(), offset, limit);
        
        // 查询总记录数
        long total = overtimeRecordMapper.countBySearch(pageRequest.getSearch());
        
        // 构建分页响应
        return new PageResponse<>(total, pageRequest.getPage(), pageRequest.getPageSize(), records);
    }
}