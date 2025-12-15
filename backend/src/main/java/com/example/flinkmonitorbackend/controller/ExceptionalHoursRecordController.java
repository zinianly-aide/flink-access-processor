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
public class ExceptionalHoursRecordController {
    @Autowired
    private ExceptionalHoursRecordService exceptionalHoursRecordService;

    @GetMapping
    public ResponseEntity<List<ExceptionalHoursRecord>> findAll() {
        try {
            return ResponseEntity.ok(exceptionalHoursRecordService.findAll());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<ExceptionalHoursRecord>> findByStatus(@PathVariable String status) {
        try {
            return ResponseEntity.ok(exceptionalHoursRecordService.findByStatus(status));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/employee/{empId}")
    public ResponseEntity<List<ExceptionalHoursRecord>> findByEmployeeId(@PathVariable Long empId) {
        try {
            return ResponseEntity.ok(exceptionalHoursRecordService.findByEmpId(empId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/indicator-type/{indicatorType}")
    public ResponseEntity<List<ExceptionalHoursRecord>> findByIndicatorType(@PathVariable String indicatorType) {
        try {
            return ResponseEntity.ok(exceptionalHoursRecordService.findByIndicatorType(indicatorType));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/{recordId}/reason")
    public ResponseEntity<?> submitReason(@PathVariable Long recordId, @RequestBody Map<String, String> reasonData) {
        try {
            exceptionalHoursRecordService.submitReason(
                    recordId,
                    reasonData.get("reason"),
                    reasonData.get("image_url"),
                    reasonData.get("preventive_measures")
            );
            return ResponseEntity.ok(exceptionalHoursRecordService.findById(recordId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error submitting reason: " + e.getMessage());
        }
    }

    @PutMapping("/{recordId}/approve")
    public ResponseEntity<?> approveRecord(@PathVariable Long recordId, @RequestParam String approvedBy) {
        try {
            exceptionalHoursRecordService.approveRecord(recordId, approvedBy);
            return ResponseEntity.ok(exceptionalHoursRecordService.findById(recordId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error approving record: " + e.getMessage());
        }
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