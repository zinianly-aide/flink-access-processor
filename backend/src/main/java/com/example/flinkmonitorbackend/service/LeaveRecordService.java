package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.dto.PageRequest;
import com.example.flinkmonitorbackend.dto.PageResponse;
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
    
    /**
     * 分页查询请假记录，支持搜索和过滤
     * @param pageRequest 分页请求对象，包含页码、每页大小、搜索关键字和过滤条件
     * @return 分页响应对象，包含总记录数和数据列表
     */
    PageResponse<LeaveRecord> findByPage(PageRequest pageRequest);
}