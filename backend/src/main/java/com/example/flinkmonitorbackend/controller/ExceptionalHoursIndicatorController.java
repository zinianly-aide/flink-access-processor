package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.entity.ExceptionalHoursIndicator;
import com.example.flinkmonitorbackend.service.ExceptionalHoursIndicatorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/exceptional-hours/indicators")
@CrossOrigin(origins = "*")
public class ExceptionalHoursIndicatorController {
    @Autowired
    private ExceptionalHoursIndicatorService exceptionalHoursIndicatorService;

    @GetMapping
    public List<ExceptionalHoursIndicator> findAll() {
        return exceptionalHoursIndicatorService.findAll();
    }

    @GetMapping("/active")
    public List<ExceptionalHoursIndicator> findActiveIndicators() {
        return exceptionalHoursIndicatorService.findActiveIndicators();
    }

    @GetMapping("/{id}")
    public ExceptionalHoursIndicator findById(@PathVariable Long id) {
        return exceptionalHoursIndicatorService.findById(id);
    }

    @PostMapping
    public void insert(@RequestBody ExceptionalHoursIndicator indicator) {
        exceptionalHoursIndicatorService.insert(indicator);
    }

    @PutMapping
    public void update(@RequestBody ExceptionalHoursIndicator indicator) {
        exceptionalHoursIndicatorService.update(indicator);
    }
}