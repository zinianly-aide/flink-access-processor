package com.example.flinkmonitorbackend.mapper;

import com.example.flinkmonitorbackend.entity.OvertimeRecord;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface OvertimeRecordMapper {
    List<OvertimeRecord> findAll();
    List<OvertimeRecord> findByEmpId(Long empId);
    List<OvertimeRecord> findByDateRange(String startDate, String endDate);
}