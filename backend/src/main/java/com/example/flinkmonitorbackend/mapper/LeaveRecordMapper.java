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
    
    /**
     * 分页查询请假记录，支持搜索
     * @param search 搜索关键字，支持所有字段的模糊搜索
     * @param offset 偏移量
     * @param limit 每页记录数
     * @return 请假记录列表
     */
    List<LeaveRecord> findByPage(@Param("search") String search, @Param("offset") int offset, @Param("limit") int limit);
    
    /**
     * 统计符合搜索条件的请假记录总数
     * @param search 搜索关键字
     * @return 记录总数
     */
    long countBySearch(@Param("search") String search);
}