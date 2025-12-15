package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.entity.AccessRecord;
import com.example.flinkmonitorbackend.service.AccessRecordService;
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
@RequestMapping("/access-records")
public class AccessRecordController {
    @Autowired
    private AccessRecordService accessRecordService;
    
    @GetMapping
    public List<AccessRecord> findAll() {
        return accessRecordService.findAll();
    }
    
    @GetMapping("/employee/{employeeId}")
    public List<AccessRecord> findByEmployeeId(@PathVariable String employeeId) {
        return accessRecordService.findByEmployeeId(employeeId);
    }
    
    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportToExcel() {
        try {
            List<AccessRecord> records = accessRecordService.findAll();
            byte[] excelBytes = ExcelExporter.exportAccessRecordsToExcel(records);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "access_records.xlsx");
            headers.setContentLength(excelBytes.length);
            
            return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}