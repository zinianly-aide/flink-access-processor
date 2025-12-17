package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.dto.PageRequest;
import com.example.flinkmonitorbackend.dto.PageResponse;
import com.example.flinkmonitorbackend.entity.OvertimeRecord;
import java.util.List;

public interface OvertimeRecordService {
    List<OvertimeRecord> findAll();
    List<OvertimeRecord> findByEmpId(Long empId);
    List<OvertimeRecord> findByDateRange(String startDate, String endDate);
    
    /**
     * 分页查询加班记录，支持搜索和过滤
     * @param pageRequest 分页请求对象，包含页码、每页大小、搜索关键字和过滤条件
     * @return 分页响应对象，包含总记录数和数据列表
     */
    PageResponse<OvertimeRecord> findByPage(PageRequest pageRequest);
}