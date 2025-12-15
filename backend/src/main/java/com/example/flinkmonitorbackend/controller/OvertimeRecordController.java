package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.entity.OvertimeRecord;
import com.example.flinkmonitorbackend.service.OvertimeRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.flinkmonitorbackend.utils.ExcelExporter;

import java.util.List;

@RestController
@RequestMapping("/overtime-records")
public class OvertimeRecordController {
    @Autowired
    private OvertimeRecordService overtimeRecordService;

    @GetMapping
    public List<OvertimeRecord> findAll() {
        return overtimeRecordService.findAll();
    }

    @GetMapping("/employee/{empId}")
    public List<OvertimeRecord> findByEmployeeId(@PathVariable Long empId) {
        return overtimeRecordService.findByEmpId(empId);
    }

    @GetMapping("/date-range")
    public List<OvertimeRecord> findByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        return overtimeRecordService.findByDateRange(startDate, endDate);
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportToExcel() {
        try {
            List<OvertimeRecord> records = overtimeRecordService.findAll();
            byte[] excelBytes = ExcelExporter.exportOvertimeRecordsToExcel(records);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "overtime_records.xlsx");
            headers.setContentLength(excelBytes.length);
            
            return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}