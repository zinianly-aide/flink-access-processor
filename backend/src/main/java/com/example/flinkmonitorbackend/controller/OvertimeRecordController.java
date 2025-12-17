package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.dto.PageRequest;
import com.example.flinkmonitorbackend.dto.PageResponse;
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
    public ResponseEntity<List<OvertimeRecord>> findAll() {
        try {
            return ResponseEntity.ok(overtimeRecordService.findAll());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    @GetMapping("/page")
    public ResponseEntity<PageResponse<OvertimeRecord>> findByPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String search) {
        try {
            PageRequest pageRequest = new PageRequest();
            pageRequest.setPage(page);
            pageRequest.setPageSize(pageSize);
            pageRequest.setSearch(search);
            return ResponseEntity.ok(overtimeRecordService.findByPage(pageRequest));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/employee/{empId}")
    public ResponseEntity<List<OvertimeRecord>> findByEmployeeId(@PathVariable Long empId) {
        try {
            return ResponseEntity.ok(overtimeRecordService.findByEmpId(empId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<OvertimeRecord>> findByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            return ResponseEntity.ok(overtimeRecordService.findByDateRange(startDate, endDate));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
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