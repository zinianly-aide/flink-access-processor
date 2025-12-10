package com.example.flinkmonitorbackend.mapper;

import com.example.flinkmonitorbackend.entity.ExceptionalHoursRecord;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface ExceptionalHoursRecordMapper {
    List<ExceptionalHoursRecord> findAll();
    List<ExceptionalHoursRecord> findByStatus(String status);
    List<ExceptionalHoursRecord> findByEmpId(Long empId);
    List<ExceptionalHoursRecord> findByIndicatorType(String indicatorType);
    ExceptionalHoursRecord findById(Long id);
    void update(ExceptionalHoursRecord record);
}