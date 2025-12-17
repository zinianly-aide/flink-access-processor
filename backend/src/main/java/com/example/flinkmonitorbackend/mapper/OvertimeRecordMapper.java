package com.example.flinkmonitorbackend.mapper;

import com.example.flinkmonitorbackend.entity.OvertimeRecord;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface OvertimeRecordMapper {
    List<OvertimeRecord> findAll();
    List<OvertimeRecord> findByEmpId(Long empId);
    List<OvertimeRecord> findByDateRange(String startDate, String endDate);
    
    /**
     * 分页查询加班记录，支持搜索
     * @param search 搜索关键字，支持所有字段的模糊搜索
     * @param offset 偏移量
     * @param limit 每页记录数
     * @return 加班记录列表
     */
    List<OvertimeRecord> findByPage(String search, int offset, int limit);
    
    /**
     * 统计符合搜索条件的加班记录总数
     * @param search 搜索关键字
     * @return 记录总数
     */
    long countBySearch(String search);
}