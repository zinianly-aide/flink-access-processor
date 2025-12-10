package com.example.flinkmonitorbackend.mapper;

import com.example.flinkmonitorbackend.entity.ExceptionalHoursIndicator;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface ExceptionalHoursIndicatorMapper {
    List<ExceptionalHoursIndicator> findAll();
    List<ExceptionalHoursIndicator> findActiveIndicators();
    ExceptionalHoursIndicator findById(Long id);
    void insert(ExceptionalHoursIndicator indicator);
    void update(ExceptionalHoursIndicator indicator);
}