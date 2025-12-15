package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.entity.ConsecutiveWorkDays;
import com.example.flinkmonitorbackend.service.ConsecutiveWorkDaysService;
import com.example.flinkmonitorbackend.utils.ExcelExporter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/consecutive-days")
public class ConsecutiveWorkDaysController {
    @Autowired
    private ConsecutiveWorkDaysService consecutiveWorkDaysService;
    
    @GetMapping
    public List<ConsecutiveWorkDays> findAll() {
        return consecutiveWorkDaysService.findAll();
    }
    
    @GetMapping("/employee/{employeeId}")
    public List<ConsecutiveWorkDays> findByEmployeeId(@PathVariable String employeeId) {
        return consecutiveWorkDaysService.findByEmployeeId(employeeId);
    }
    
    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportToExcel() {
        try {
            List<ConsecutiveWorkDays> records = consecutiveWorkDaysService.findAll();
            byte[] excelBytes = ExcelExporter.exportConsecutiveWorkDaysToExcel(records);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "consecutive_work_days.xlsx");
            headers.setContentLength(excelBytes.length);
            
            return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}