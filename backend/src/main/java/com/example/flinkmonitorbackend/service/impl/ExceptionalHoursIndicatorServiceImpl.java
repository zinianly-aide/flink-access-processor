package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.entity.ExceptionalHoursIndicator;
import com.example.flinkmonitorbackend.mapper.ExceptionalHoursIndicatorMapper;
import com.example.flinkmonitorbackend.service.ExceptionalHoursIndicatorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ExceptionalHoursIndicatorServiceImpl implements ExceptionalHoursIndicatorService {
    @Autowired
    private ExceptionalHoursIndicatorMapper exceptionalHoursIndicatorMapper;

    @Override
    public List<ExceptionalHoursIndicator> findAll() {
        return exceptionalHoursIndicatorMapper.findAll();
    }

    @Override
    public List<ExceptionalHoursIndicator> findActiveIndicators() {
        return exceptionalHoursIndicatorMapper.findActiveIndicators();
    }

    @Override
    public ExceptionalHoursIndicator findById(Long id) {
        return exceptionalHoursIndicatorMapper.findById(id);
    }

    @Override
    public void insert(ExceptionalHoursIndicator indicator) {
        exceptionalHoursIndicatorMapper.insert(indicator);
    }

    @Override
    public void update(ExceptionalHoursIndicator indicator) {
        exceptionalHoursIndicatorMapper.update(indicator);
    }
}