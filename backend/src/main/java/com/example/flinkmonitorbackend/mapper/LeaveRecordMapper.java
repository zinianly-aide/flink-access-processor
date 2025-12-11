package com.example.flinkmonitorbackend.mapper;

import com.example.flinkmonitorbackend.entity.LeaveRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface LeaveRecordMapper {
    List<LeaveRecord> findAll();
    List<LeaveRecord> findByEmpId(Long empId);
    List<LeaveRecord> findByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    List<LeaveRecord> findByOrgId(Long orgId);
    List<Map<String, Object>> getDeptLeaveSummary();
    List<Map<String, Object>> getDeptNetOvertimeSummary();
}