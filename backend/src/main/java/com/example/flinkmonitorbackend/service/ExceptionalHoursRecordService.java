package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.dto.PageRequest;
import com.example.flinkmonitorbackend.dto.PageResponse;
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
    
    /**
     * 分页查询异常工时记录，支持搜索和过滤
     * @param pageRequest 分页请求对象，包含页码、每页大小、搜索关键字和过滤条件
     * @return 分页响应对象，包含总记录数和数据列表
     */
    PageResponse<ExceptionalHoursRecord> findByPage(PageRequest pageRequest);
}