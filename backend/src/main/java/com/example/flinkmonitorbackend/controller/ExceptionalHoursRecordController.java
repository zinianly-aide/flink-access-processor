package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.entity.ExceptionalHoursRecord;
import com.example.flinkmonitorbackend.service.ExceptionalHoursRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.flinkmonitorbackend.utils.ExcelExporter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/exceptional-hours/records")
@CrossOrigin(origins = "*")
public class ExceptionalHoursRecordController {
    @Autowired
    private ExceptionalHoursRecordService exceptionalHoursRecordService;

    @GetMapping
    public List<ExceptionalHoursRecord> findAll() {
        return exceptionalHoursRecordService.findAll();
    }

    @GetMapping("/status/{status}")
    public List<ExceptionalHoursRecord> findByStatus(@PathVariable String status) {
        return exceptionalHoursRecordService.findByStatus(status);
    }

    @GetMapping("/employee/{empId}")
    public List<ExceptionalHoursRecord> findByEmployeeId(@PathVariable Long empId) {
        return exceptionalHoursRecordService.findByEmpId(empId);
    }

    @GetMapping("/indicator-type/{indicatorType}")
    public List<ExceptionalHoursRecord> findByIndicatorType(@PathVariable String indicatorType) {
        return exceptionalHoursRecordService.findByIndicatorType(indicatorType);
    }

    @PostMapping("/{recordId}/reason")
    public ExceptionalHoursRecord submitReason(@PathVariable Long recordId, @RequestBody Map<String, String> reasonData) {
        exceptionalHoursRecordService.submitReason(
                recordId,
                reasonData.get("reason"),
                reasonData.get("image_url"),
                reasonData.get("preventive_measures")
        );
        return exceptionalHoursRecordService.findById(recordId);
    }

    @PutMapping("/{recordId}/approve")
    public ExceptionalHoursRecord approveRecord(@PathVariable Long recordId, @RequestParam String approvedBy) {
        exceptionalHoursRecordService.approveRecord(recordId, approvedBy);
        return exceptionalHoursRecordService.findById(recordId);
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportToExcel() {
        try {
            List<ExceptionalHoursRecord> records = exceptionalHoursRecordService.findAll();
            byte[] excelBytes = ExcelExporter.exportExceptionalHoursRecordsToExcel(records);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "exceptional_hours_records.xlsx");
            headers.setContentLength(excelBytes.length);
            
            return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}