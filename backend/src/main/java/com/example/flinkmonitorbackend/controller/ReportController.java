package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.entity.Report;
import com.example.flinkmonitorbackend.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reports")
public class ReportController {
    @Autowired
    private ReportService reportService;
    
    /**
     * 生成报表
     */
    @PostMapping("/generate")
    public ResponseEntity<Report> generateReport(@RequestBody ReportRequest request) {
        try {
            Report report = reportService.generateReport(request.getQuery());
            return new ResponseEntity<>(report, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 获取历史报表列表
     */
    @GetMapping("/history")
    public ResponseEntity<List<Report>> getReportHistory() {
        try {
            List<Report> reports = reportService.getReportHistory();
            return new ResponseEntity<>(reports, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 根据ID获取报表详情
     */
    @GetMapping("/{reportId}")
    public ResponseEntity<Report> getReportById(@PathVariable Long reportId) {
        try {
            Report report = reportService.getReportById(reportId);
            if (report == null) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
            return new ResponseEntity<>(report, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 删除报表
     */
    @DeleteMapping("/{reportId}")
    public ResponseEntity<Void> deleteReport(@PathVariable Long reportId) {
        try {
            reportService.deleteReport(reportId);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 报表生成请求的内部类
     */
    public static class ReportRequest {
        private String query;
        
        // Getters and setters
        public String getQuery() {
            return query;
        }
        
        public void setQuery(String query) {
            this.query = query;
        }
    }
}