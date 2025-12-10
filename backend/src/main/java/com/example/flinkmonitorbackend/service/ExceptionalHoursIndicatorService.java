package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.entity.ExceptionalHoursIndicator;
import java.util.List;

public interface ExceptionalHoursIndicatorService {
    List<ExceptionalHoursIndicator> findAll();
    List<ExceptionalHoursIndicator> findActiveIndicators();
    ExceptionalHoursIndicator findById(Long id);
    void insert(ExceptionalHoursIndicator indicator);
    void update(ExceptionalHoursIndicator indicator);
}