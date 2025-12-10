package com.example.flinkmonitorbackend.utils;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import com.example.flinkmonitorbackend.entity.AlertRecord;
import com.example.flinkmonitorbackend.entity.ConsecutiveWorkDays;
import com.example.flinkmonitorbackend.entity.AccessRecord;
import com.example.flinkmonitorbackend.entity.OvertimeRecord;
import com.example.flinkmonitorbackend.entity.ExceptionalHoursRecord;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

public class ExcelExporter {
    
    // 导出提醒记录到Excel
    public static byte[] exportAlertRecordsToExcel(List<AlertRecord> records) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("提醒记录");
            
            // 创建表头
            Row headerRow = sheet.createRow(0);
            String[] headers = {"ID", "员工ID", "提醒日期", "提醒时间", "提醒消息", "创建时间"};
            
            // 设置表头样式
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.autoSizeColumn(i);
            }
            
            // 填充数据
            int rowNum = 1;
            for (AlertRecord record : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(record.getId());
                row.createCell(1).setCellValue(record.getEmployeeId());
                if (record.getAlertDate() != null) {
                    row.createCell(2).setCellValue(record.getAlertDate().toString());
                }
                row.createCell(3).setCellValue(record.getAlertTime());
                row.createCell(4).setCellValue(record.getAlertMessage());
                if (record.getCreatedAt() != null) {
                    row.createCell(5).setCellValue(record.getCreatedAt().toString());
                }
            }
            
            // 自适应列宽
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }
    
    // 导出连续工作天数到Excel
    public static byte[] exportConsecutiveWorkDaysToExcel(List<ConsecutiveWorkDays> records) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("连续工作天数");
            
            // 创建表头
            Row headerRow = sheet.createRow(0);
            String[] headers = {"ID", "员工ID", "连续工作天数", "开始日期", "结束日期"};
            
            // 设置表头样式
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.autoSizeColumn(i);
            }
            
            // 填充数据
            int rowNum = 1;
            for (ConsecutiveWorkDays record : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(record.getId());
                row.createCell(1).setCellValue(record.getEmployeeId());
                row.createCell(2).setCellValue(record.getConsecutiveDays());
                if (record.getStartDate() != null) {
                    row.createCell(3).setCellValue(record.getStartDate().toString());
                }
                if (record.getEndDate() != null) {
                    row.createCell(4).setCellValue(record.getEndDate().toString());
                }
            }
            
            // 自适应列宽
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }
    
    // 导出门禁记录到Excel
    public static byte[] exportAccessRecordsToExcel(List<AccessRecord> records) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("门禁记录");
            
            // 创建表头
            Row headerRow = sheet.createRow(0);
            String[] headers = {"ID", "员工ID", "访问时间", "进出方向", "创建时间"};
            
            // 设置表头样式
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.autoSizeColumn(i);
            }
            
            // 填充数据
            int rowNum = 1;
            for (AccessRecord record : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(record.getId());
                row.createCell(1).setCellValue(record.getEmployeeId());
                if (record.getAccessTime() != null) {
                    row.createCell(2).setCellValue(record.getAccessTime().toString());
                }
                row.createCell(3).setCellValue(record.getDirection());
                if (record.getCreatedAt() != null) {
                    row.createCell(4).setCellValue(record.getCreatedAt().toString());
                }
            }
            
            // 自适应列宽
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }
    
    // 导出加班记录到Excel
    public static byte[] exportOvertimeRecordsToExcel(List<OvertimeRecord> records) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("加班记录");
            
            // 创建表头
            Row headerRow = sheet.createRow(0);
            String[] headers = {"ID", "员工ID", "工作日期", "实际工作小时", "正常工作小时", "加班小时", "创建时间"};
            
            // 设置表头样式
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.autoSizeColumn(i);
            }
            
            // 填充数据
            int rowNum = 1;
            for (OvertimeRecord record : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(record.getId());
                row.createCell(1).setCellValue(record.getEmpId());
                if (record.getWorkDate() != null) {
                    row.createCell(2).setCellValue(record.getWorkDate().toString());
                }
                row.createCell(3).setCellValue(record.getActualHours());
                row.createCell(4).setCellValue(record.getRegularHours());
                row.createCell(5).setCellValue(record.getOvertimeHours());
                if (record.getCreatedAt() != null) {
                    row.createCell(6).setCellValue(record.getCreatedAt().toString());
                }
            }
            
            // 自适应列宽
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }
    
    // 导出异常工时记录到Excel
    public static byte[] exportExceptionalHoursRecordsToExcel(List<ExceptionalHoursRecord> records) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("异常工时记录");
            
            // 创建表头
            Row headerRow = sheet.createRow(0);
            String[] headers = {"ID", "员工ID", "指标名称", "指标类型", "实际值", "阈值", "统计周期开始", "统计周期结束", "状态", "原因说明", "创建时间"};
            
            // 设置表头样式
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.autoSizeColumn(i);
            }
            
            // 填充数据
            int rowNum = 1;
            for (ExceptionalHoursRecord record : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(record.getId());
                row.createCell(1).setCellValue(record.getEmpId());
                row.createCell(2).setCellValue(record.getIndicatorName());
                row.createCell(3).setCellValue(record.getIndicatorType());
                row.createCell(4).setCellValue(record.getActualValue());
                row.createCell(5).setCellValue(record.getThreshold());
                if (record.getPeriodStart() != null) {
                    row.createCell(6).setCellValue(record.getPeriodStart().toString());
                }
                if (record.getPeriodEnd() != null) {
                    row.createCell(7).setCellValue(record.getPeriodEnd().toString());
                }
                row.createCell(8).setCellValue(record.getStatus());
                if (record.getReason() != null) {
                    row.createCell(9).setCellValue(record.getReason());
                }
                if (record.getCreatedAt() != null) {
                    row.createCell(10).setCellValue(record.getCreatedAt().toString());
                }
            }
            
            // 自适应列宽
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }
}