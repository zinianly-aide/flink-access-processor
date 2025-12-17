package com.example.flinkmonitorbackend.mapper;

import com.example.flinkmonitorbackend.entity.ExceptionalHoursRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ExceptionalHoursRecordMapper {
    List<ExceptionalHoursRecord> findAll();
    List<ExceptionalHoursRecord> findByStatus(String status);
    List<ExceptionalHoursRecord> findByEmpId(Long empId);
    List<ExceptionalHoursRecord> findByIndicatorType(String indicatorType);
    ExceptionalHoursRecord findById(Long id);
    void update(ExceptionalHoursRecord record);
    
    /**
     * 分页查询异常工时记录，支持搜索
     * @param search 搜索关键字，支持所有字段的模糊搜索
     * @param offset 偏移量
     * @param limit 每页记录数
     * @return 异常工时记录列表
     */
    List<ExceptionalHoursRecord> findByPage(@Param("search") String search, @Param("offset") int offset, @Param("limit") int limit);
    
    /**
     * 统计符合搜索条件的异常工时记录总数
     * @param search 搜索关键字
     * @return 记录总数
     */
    long countBySearch(@Param("search") String search);
}