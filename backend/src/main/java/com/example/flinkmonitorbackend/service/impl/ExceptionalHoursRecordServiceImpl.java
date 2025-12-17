package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.dto.PageRequest;
import com.example.flinkmonitorbackend.dto.PageResponse;
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
        if (record == null) {
            throw new IllegalArgumentException("Exceptional hours record not found: " + recordId);
        }
        
        // 验证状态，只有待处理的记录才能被处理
        if (!"pending".equals(record.getStatus())) {
            throw new IllegalArgumentException("Only pending records can be processed: " + recordId);
        }
        
        record.setReason(reason);
        record.setImageUrl(imageUrl);
        record.setPreventiveMeasures(preventiveMeasures);
        record.setStatus("processed");
        record.setUpdatedAt(new Date());
        exceptionalHoursRecordMapper.update(record);
    }

    @Override
    public void approveRecord(Long recordId, String approvedBy) {
        ExceptionalHoursRecord record = exceptionalHoursRecordMapper.findById(recordId);
        if (record == null) {
            throw new IllegalArgumentException("Exceptional hours record not found: " + recordId);
        }
        
        // 验证状态，只有已处理的记录才能被批准
        if (!"processed".equals(record.getStatus())) {
            throw new IllegalArgumentException("Only processed records can be approved: " + recordId);
        }
        
        record.setStatus("approved");
        record.setApprovedBy(approvedBy);
        record.setApprovedAt(new Date());
        record.setUpdatedAt(new Date());
        exceptionalHoursRecordMapper.update(record);
    }
    
    @Override
    public PageResponse<ExceptionalHoursRecord> findByPage(PageRequest pageRequest) {
        // 计算分页参数
        int offset = (pageRequest.getPage() - 1) * pageRequest.getPageSize();
        int limit = pageRequest.getPageSize();
        
        // 查询数据列表
        List<ExceptionalHoursRecord> records = exceptionalHoursRecordMapper.findByPage(pageRequest.getSearch(), offset, limit);
        
        // 查询总记录数
        long total = exceptionalHoursRecordMapper.countBySearch(pageRequest.getSearch());
        
        // 构建分页响应
        return new PageResponse<>(total, pageRequest.getPage(), pageRequest.getPageSize(), records);
    }
}