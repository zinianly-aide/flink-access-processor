package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.entity.Report;

import java.util.List;

public interface ReportService {
    /**
     * 根据自然语言查询生成报表
     * @param naturalLanguageQuery 自然语言查询
     * @return 生成的报表
     */
    Report generateReport(String naturalLanguageQuery);
    
    /**
     * 获取历史报表列表
     * @return 历史报表列表
     */
    List<Report> getReportHistory();
    
    /**
     * 根据ID获取报表详情
     * @param reportId 报表ID
     * @return 报表详情
     */
    Report getReportById(Long reportId);
    
    /**
     * 删除报表
     * @param reportId 报表ID
     */
    void deleteReport(Long reportId);
}