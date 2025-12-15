package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.entity.LeaveRecord;
import com.example.flinkmonitorbackend.service.LeaveRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/leave-records")
public class LeaveRecordController {
    @Autowired
    private LeaveRecordService leaveRecordService;

    @GetMapping
    public ResponseEntity<List<LeaveRecord>> findAll() {
        try {
            return ResponseEntity.ok(leaveRecordService.findAll());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/employee/{empId}")
    public ResponseEntity<List<LeaveRecord>> findByEmployeeId(@PathVariable Long empId) {
        try {
            return ResponseEntity.ok(leaveRecordService.findByEmpId(empId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<LeaveRecord>> findByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            return ResponseEntity.ok(leaveRecordService.findByDateRange(startDate, endDate));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/org/{orgId}")
    public ResponseEntity<List<LeaveRecord>> findByOrgId(@PathVariable Long orgId) {
        try {
            return ResponseEntity.ok(leaveRecordService.findByOrgId(orgId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/summary/dept")
    public ResponseEntity<List<Map<String, Object>>> getDeptLeaveSummary() {
        try {
            return ResponseEntity.ok(leaveRecordService.getDeptLeaveSummary());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/summary/net-overtime")
    public ResponseEntity<List<Map<String, Object>>> getDeptNetOvertimeSummary() {
        try {
            return ResponseEntity.ok(leaveRecordService.getDeptNetOvertimeSummary());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}