-- 测试数据插入脚本
-- 用于生成各种场景的测试数据，方便测试SQL生成器和查询结果

-- 1. 清空现有数据（可选，根据需要执行）
-- TRUNCATE TABLE organizations;
-- TRUNCATE TABLE leave_record;
-- TRUNCATE TABLE overtime_records;
-- TRUNCATE TABLE exceptional_hours_records;
-- TRUNCATE TABLE consecutive_work_days;

-- 2. 插入组织数据
-- 不指定ID，使用自动递增，避免重复键错误
INSERT INTO organizations (org_name, org_code, parent_id, description, is_active, created_at, updated_at)
VALUES 
('总部', 'HQ', NULL, '公司总部', 1, NOW(), NOW()),
('技术部', 'TECH', 1, '负责研发和技术支持', 1, NOW(), NOW()),
('销售部', 'SALES', 1, '负责市场销售', 1, NOW(), NOW()),
('人力资源部', 'HR', 1, '负责员工管理', 1, NOW(), NOW()),
('财务部', 'FIN', 1, '负责财务核算', 1, NOW(), NOW()),
('研发一组', 'R&D1', 2, '负责核心产品研发', 1, NOW(), NOW()),
('研发二组', 'R&D2', 2, '负责新技术探索', 1, NOW(), NOW()),
('北京销售部', 'SALES_BJ', 3, '北京地区销售', 1, NOW(), NOW()),
('上海销售部', 'SALES_SH', 3, '上海地区销售', 1, NOW(), NOW()),
('广州销售部', 'SALES_GZ', 3, '广州地区销售', 1, NOW(), NOW());

-- 3. 插入请假记录
INSERT INTO hrbp_leave_record (id, emp_id, org_id, leave_type, start_time, end_time, leave_hours, status, created_at)
VALUES 
(1, 1001, 2, 'annual', '2025-12-01 09:00:00', '2025-12-02 18:00:00', 16, 'approved', NOW()),
(2, 1002, 3, 'sick', '2025-12-03 09:00:00', '2025-12-03 18:00:00', 8, 'approved', NOW()),
(3, 1003, 4, 'personal', '2025-12-04 13:00:00', '2025-12-04 18:00:00', 5, 'pending', NOW()),
(4, 1004, 5, 'annual', '2025-12-05 09:00:00', '2025-12-09 18:00:00', 40, 'approved', NOW()),
(5, 1005, 6, 'sick', '2025-12-06 09:00:00', '2025-12-06 18:00:00', 8, 'approved', NOW()),
(6, 1006, 7, 'personal', '2025-12-07 09:00:00', '2025-12-07 18:00:00', 8, 'approved', NOW()),
(7, 1007, 8, 'annual', '2025-12-08 09:00:00', '2025-12-08 18:00:00', 8, 'pending', NOW()),
(8, 1008, 9, 'sick', '2025-12-09 09:00:00', '2025-12-10 18:00:00', 16, 'approved', NOW()),
(9, 1009, 10, 'personal', '2025-12-11 13:00:00', '2025-12-11 18:00:00', 5, 'approved', NOW()),
(10, 1010, 2, 'annual', '2025-12-12 09:00:00', '2025-12-16 18:00:00', 40, 'pending', NOW());

-- 4. 插入加班记录
INSERT INTO overtime_records (id, emp_id, work_date, actual_hours, regular_hours, overtime_hours, created_at)
VALUES 
(1, 1001, '2025-12-01', 10, 8, 2, NOW()),
(2, 1002, '2025-12-01', 11, 8, 3, NOW()),
(3, 1003, '2025-12-02', 9, 8, 1, NOW()),
(4, 1004, '2025-12-02', 12, 8, 4, NOW()),
(5, 1005, '2025-12-03', 10, 8, 2, NOW()),
(6, 1006, '2025-12-03', 13, 8, 5, NOW()),
(7, 1007, '2025-12-04', 9, 8, 1, NOW()),
(8, 1008, '2025-12-04', 11, 8, 3, NOW()),
(9, 1009, '2025-12-05', 10, 8, 2, NOW()),
(10, 1010, '2025-12-05', 12, 8, 4, NOW()),
(11, 1001, '2025-12-06', 11, 8, 3, NOW()),
(12, 1002, '2025-12-06', 9, 8, 1, NOW()),
(13, 1003, '2025-12-07', 14, 8, 6, NOW()),
(14, 1004, '2025-12-07', 10, 8, 2, NOW()),
(15, 1005, '2025-12-08', 12, 8, 4, NOW());

-- 5. 插入异常工时记录
INSERT INTO exceptional_hours_records (id, emp_id, org_id, indicator_name, actual_value, threshold, status, period_start, period_end, created_at)
VALUES 
(1, 1001, 2, '连续工作天数', 6, 5, 'pending', '2025-11-25', '2025-12-01', NOW()),
(2, 1002, 3, '月度加班小时', 45, 40, 'pending', '2025-11-01', '2025-11-30', NOW()),
(3, 1003, 4, '连续工作天数', 8, 5, 'processed', '2025-11-20', '2025-11-27', NOW()),
(4, 1004, 5, '月度加班小时', 52, 40, 'approved', '2025-11-01', '2025-11-30', NOW()),
(5, 1005, 6, '连续工作天数', 7, 5, 'pending', '2025-12-01', '2025-12-07', NOW()),
(6, 1006, 7, '月度加班小时', 38, 40, 'normal', '2025-11-01', '2025-11-30', NOW()),
(7, 1007, 8, '连续工作天数', 5, 5, 'normal', '2025-12-01', '2025-12-05', NOW()),
(8, 1008, 9, '月度加班小时', 42, 40, 'pending', '2025-11-01', '2025-11-30', NOW()),
(9, 1009, 10, '连续工作天数', 9, 5, 'processed', '2025-11-15', '2025-11-23', NOW()),
(10, 1010, 2, '月度加班小时', 48, 40, 'pending', '2025-11-01', '2025-11-30', NOW());

-- 6. 插入连续工作天数记录
INSERT INTO consecutive_work_days (id, emp_id, org_id, work_date, consecutive_days, is_active, created_at)
VALUES 
(1, 1001, 2, '2025-12-01', 6, 1, NOW()),
(2, 1002, 3, '2025-12-01', 3, 1, NOW()),
(3, 1003, 4, '2025-12-02', 5, 1, NOW()),
(4, 1004, 5, '2025-12-02', 2, 1, NOW()),
(5, 1005, 6, '2025-12-03', 7, 1, NOW()),
(6, 1006, 7, '2025-12-03', 4, 1, NOW()),
(7, 1007, 8, '2025-12-04', 5, 1, NOW()),
(8, 1008, 9, '2025-12-04', 3, 1, NOW()),
(9, 1009, 10, '2025-12-05', 6, 1, NOW()),
(10, 1010, 2, '2025-12-05', 2, 1, NOW());

-- 7. 插入门禁记录
INSERT INTO hrbp_gate_record (id, emp_id, org_id, record_type, record_time, gate_id, created_at)
VALUES 
(1, 1001, 2, 'in', '2025-12-01 08:30:00', 'GATE001', NOW()),
(2, 1001, 2, 'out', '2025-12-01 18:30:00', 'GATE001', NOW()),
(3, 1002, 3, 'in', '2025-12-01 09:00:00', 'GATE001', NOW()),
(4, 1002, 3, 'out', '2025-12-01 19:30:00', 'GATE001', NOW()),
(5, 1003, 4, 'in', '2025-12-02 08:15:00', 'GATE002', NOW()),
(6, 1003, 4, 'out', '2025-12-02 17:45:00', 'GATE002', NOW()),
(7, 1004, 5, 'in', '2025-12-02 08:45:00', 'GATE002', NOW()),
(8, 1004, 5, 'out', '2025-12-02 20:15:00', 'GATE002', NOW()),
(9, 1005, 6, 'in', '2025-12-03 08:30:00', 'GATE001', NOW()),
(10, 1005, 6, 'out', '2025-12-03 18:30:00', 'GATE001', NOW());

-- 8. 插入排班记录
INSERT INTO hrbp_schedule_shift (id, emp_id, org_id, shift_date, shift_type, start_time, end_time, status, created_at)
VALUES 
(1, 1001, 2, '2025-12-01', 'normal', '09:00:00', '18:00:00', 'confirmed', NOW()),
(2, 1002, 3, '2025-12-01', 'normal', '09:00:00', '18:00:00', 'confirmed', NOW()),
(3, 1003, 4, '2025-12-02', 'normal', '09:00:00', '18:00:00', 'confirmed', NOW()),
(4, 1004, 5, '2025-12-02', 'normal', '09:00:00', '18:00:00', 'confirmed', NOW()),
(5, 1005, 6, '2025-12-03', 'normal', '09:00:00', '18:00:00', 'confirmed', NOW()),
(6, 1006, 7, '2025-12-03', 'normal', '09:00:00', '18:00:00', 'confirmed', NOW()),
(7, 1007, 8, '2025-12-04', 'normal', '09:00:00', '18:00:00', 'confirmed', NOW()),
(8, 1008, 9, '2025-12-04', 'normal', '09:00:00', '18:00:00', 'confirmed', NOW()),
(9, 1009, 10, '2025-12-05', 'normal', '09:00:00', '18:00:00', 'confirmed', NOW()),
(10, 1010, 2, '2025-12-05', 'normal', '09:00:00', '18:00:00', 'confirmed', NOW());

-- 9. 插入出差记录
INSERT INTO hrbp_trip_record (id, emp_id, org_id, trip_type, start_date, end_date, destination, purpose, status, created_at)
VALUES 
(1, 1001, 2, 'business', '2025-11-20', '2025-11-25', '北京', '客户拜访', 'approved', NOW()),
(2, 1002, 3, 'training', '2025-11-22', '2025-11-26', '上海', '产品培训', 'approved', NOW()),
(3, 1003, 4, 'business', '2025-11-25', '2025-11-30', '广州', '项目启动会', 'approved', NOW()),
(4, 1004, 5, 'business', '2025-11-28', '2025-12-02', '深圳', '供应商谈判', 'pending', NOW()),
(5, 1005, 6, 'training', '2025-12-01', '2025-12-05', '杭州', '技术研讨会', 'pending', NOW());

-- 10. 插入告警记录
INSERT INTO alert_record (id, emp_id, org_id, alert_type, alert_content, severity, status, created_at, processed_at, processed_by)
VALUES 
(1, 1001, 2, '连续工作告警', '连续工作6天', 'medium', 'pending', NOW(), NULL, NULL),
(2, 1002, 3, '加班超时告警', '月度加班45小时', 'medium', 'pending', NOW(), NULL, NULL),
(3, 1003, 4, '连续工作告警', '连续工作8天', 'high', 'processed', NOW(), NOW(), 'HR001'),
(4, 1004, 5, '加班超时告警', '月度加班52小时', 'high', 'approved', NOW(), NOW(), 'HR001'),
(5, 1005, 6, '连续工作告警', '连续工作7天', 'medium', 'pending', NOW(), NULL, NULL),
(6, 1006, 7, '正常', '一切正常', 'low', 'normal', NOW(), NULL, NULL),
(7, 1007, 8, '正常', '一切正常', 'low', 'normal', NOW(), NULL, NULL),
(8, 1008, 9, '加班超时告警', '月度加班42小时', 'medium', 'pending', NOW(), NULL, NULL),
(9, 1009, 10, '连续工作告警', '连续工作9天', 'high', 'processed', NOW(), NOW(), 'HR002'),
(10, 1010, 2, '加班超时告警', '月度加班48小时', 'high', 'pending', NOW(), NULL, NULL);

-- 11. 更新自增ID（如果需要）
-- ALTER TABLE organizations AUTO_INCREMENT = 11;
-- ALTER TABLE leave_record AUTO_INCREMENT = 11;
-- ALTER TABLE overtime_records AUTO_INCREMENT = 16;
-- ALTER TABLE exceptional_hours_records AUTO_INCREMENT = 11;
-- ALTER TABLE consecutive_work_days AUTO_INCREMENT = 11;
-- ALTER TABLE hrbp_gate_record AUTO_INCREMENT = 11;
-- ALTER TABLE hrbp_schedule_shift AUTO_INCREMENT = 11;
-- ALTER TABLE hrbp_trip_record AUTO_INCREMENT = 6;
-- ALTER TABLE alert_record AUTO_INCREMENT = 11;

-- 12. 插入考勤记录（模拟数据）
INSERT INTO absence_record (id, emp_id, org_id, absence_date, absence_type, absence_hours, status, reason, created_at)
VALUES 
(1, 1001, 2, '2025-11-15', 'sick', 8, 'approved', '感冒发烧', NOW()),
(2, 1002, 3, '2025-11-18', 'personal', 4, 'approved', '个人事务', NOW()),
(3, 1003, 4, '2025-11-20', 'annual', 8, 'approved', '年假', NOW()),
(4, 1004, 5, '2025-11-22', 'sick', 8, 'approved', '胃痛', NOW()),
(5, 1005, 6, '2025-11-25', 'personal', 8, 'pending', NULL, NOW()),
(6, 1006, 7, '2025-11-28', 'annual', 8, 'approved', '年假', NOW()),
(7, 1007, 8, '2025-12-01', 'sick', 4, 'pending', NULL, NOW()),
(8, 1008, 9, '2025-12-03', 'personal', 8, 'approved', '家庭聚会', NOW()),
(9, 1009, 10, '2025-12-05', 'annual', 8, 'approved', '年假', NOW()),
(10, 1010, 2, '2025-12-07', 'sick', 8, 'pending', NULL, NOW());

-- 13. 插入连续工作天数数据（更多样本）
INSERT INTO consecutive_work_days (id, emp_id, org_id, work_date, consecutive_days, is_active, created_at)
VALUES 
(11, 1001, 2, '2025-12-06', 3, 1, NOW()),
(12, 1002, 3, '2025-12-06', 4, 1, NOW()),
(13, 1003, 4, '2025-12-07', 2, 1, NOW()),
(14, 1004, 5, '2025-12-07', 5, 1, NOW()),
(15, 1005, 6, '2025-12-08', 4, 1, NOW());

-- 14. 插入更多的组织数据
INSERT INTO organizations (id, org_name, org_code, parent_id, description, is_active, created_at, updated_at)
VALUES 
(11, '深圳分公司', 'SZ_BRANCH', 1, '深圳分公司', 1, NOW(), NOW()),
(12, '成都分公司', 'CD_BRANCH', 1, '成都分公司', 1, NOW(), NOW()),
(13, '西安研发中心', 'XA_RD', 2, '西安研发中心', 1, NOW(), NOW()),
(14, '武汉研发中心', 'WH_RD', 2, '武汉研发中心', 1, NOW(), NOW()),
(15, '深圳销售部', 'SALES_SZ', 3, '深圳销售部', 1, NOW(), NOW());

-- 15. 插入更多的员工数据（通过各种关联表体现）
-- 注意：这里我们通过关联表间接生成了多个员工ID的测试数据
-- 实际使用中，如果有employee表，可以直接插入员工数据

-- 插入更多的请假记录，覆盖更多员工
INSERT INTO hrbp_leave_record (id, emp_id, org_id, leave_type, start_time, end_time, leave_hours, status, created_at)
VALUES 
(11, 1011, 11, 'sick', '2025-12-01 09:00:00', '2025-12-01 18:00:00', 8, 'approved', NOW()),
(12, 1012, 12, 'annual', '2025-12-02 09:00:00', '2025-12-02 18:00:00', 8, 'approved', NOW()),
(13, 1013, 13, 'personal', '2025-12-03 09:00:00', '2025-12-03 18:00:00', 8, 'approved', NOW()),
(14, 1014, 14, 'sick', '2025-12-04 09:00:00', '2025-12-04 18:00:00', 8, 'pending', NOW()),
(15, 1015, 15, 'annual', '2025-12-05 09:00:00', '2025-12-05 18:00:00', 8, 'pending', NOW());

-- 插入更多的加班记录，覆盖更多员工
INSERT INTO overtime_records (id, emp_id, work_date, actual_hours, regular_hours, overtime_hours, created_at)
VALUES 
(16, 1011, '2025-12-01', 9, 8, 1, NOW()),
(17, 1012, '2025-12-01', 10, 8, 2, NOW()),
(18, 1013, '2025-12-02', 11, 8, 3, NOW()),
(19, 1014, '2025-12-02', 12, 8, 4, NOW()),
(20, 1015, '2025-12-03', 13, 8, 5, NOW());

-- 插入更多的异常工时记录，覆盖更多员工
INSERT INTO exceptional_hours_records (id, emp_id, org_id, indicator_name, actual_value, threshold, status, period_start, period_end, created_at)
VALUES 
(11, 1011, 11, '连续工作天数', 7, 5, 'pending', '2025-11-26', '2025-12-02', NOW()),
(12, 1012, 12, '月度加班小时', 42, 40, 'pending', '2025-11-01', '2025-11-30', NOW()),
(13, 1013, 13, '连续工作天数', 6, 5, 'pending', '2025-12-01', '2025-12-06', NOW()),
(14, 1014, 14, '月度加班小时', 38, 40, 'normal', '2025-11-01', '2025-11-30', NOW()),
(15, 1015, 15, '连续工作天数', 5, 5, 'normal', '2025-12-01', '2025-12-05', NOW());

-- 插入更多的告警记录，覆盖更多员工
INSERT INTO alert_record (id, emp_id, org_id, alert_type, alert_content, severity, status, created_at, processed_at, processed_by)
VALUES 
(11, 1011, 11, '连续工作告警', '连续工作7天', 'medium', 'pending', NOW(), NULL, NULL),
(12, 1012, 12, '加班超时告警', '月度加班42小时', 'medium', 'pending', NOW(), NULL, NULL),
(13, 1013, 13, '连续工作告警', '连续工作6天', 'medium', 'pending', NOW(), NULL, NULL),
(14, 1014, 14, '正常', '一切正常', 'low', 'normal', NOW(), NULL, NULL),
(15, 1015, 15, '正常', '一切正常', 'low', 'normal', NOW(), NULL, NULL);

-- 插入更多的考勤记录
INSERT INTO hrbp_gate_record (id, emp_id, org_id, record_type, record_time, gate_id, created_at)
VALUES 
(11, 1006, 7, 'in', '2025-12-03 08:30:00', 'GATE001', NOW()),
(12, 1006, 7, 'out', '2025-12-03 18:30:00', 'GATE001', NOW()),
(13, 1007, 8, 'in', '2025-12-04 08:30:00', 'GATE001', NOW()),
(14, 1007, 8, 'out', '2025-12-04 17:30:00', 'GATE001', NOW()),
(15, 1008, 9, 'in', '2025-12-05 08:30:00', 'GATE002', NOW()),
(16, 1008, 9, 'out', '2025-12-05 19:30:00', 'GATE002', NOW()),
(17, 1009, 10, 'in', '2025-12-06 08:30:00', 'GATE002', NOW()),
(18, 1009, 10, 'out', '2025-12-06 18:30:00', 'GATE002', NOW()),
(19, 1010, 2, 'in', '2025-12-07 08:30:00', 'GATE001', NOW()),
(20, 1010, 2, 'out', '2025-12-07 20:30:00', 'GATE001', NOW());

-- 插入更多的请假记录
INSERT INTO hrbp_leave_record (id, emp_id, org_id, leave_type, start_time, end_time, leave_hours, status, created_at)
VALUES 
(16, 1006, 7, 'sick', '2025-12-09 09:00:00', '2025-12-09 18:00:00', 8, 'approved', NOW()),
(17, 1007, 8, 'personal', '2025-12-10 09:00:00', '2025-12-10 18:00:00', 8, 'approved', NOW()),
(18, 1008, 9, 'annual', '2025-12-11 09:00:00', '2025-12-11 18:00:00', 8, 'pending', NOW()),
(19, 1009, 10, 'sick', '2025-12-12 09:00:00', '2025-12-12 18:00:00', 8, 'approved', NOW()),
(20, 1010, 2, 'personal', '2025-12-13 09:00:00', '2025-12-13 18:00:00', 8, 'pending', NOW());

-- 插入更多的加班记录
INSERT INTO overtime_records (id, emp_id, work_date, actual_hours, regular_hours, overtime_hours, created_at)
VALUES 
(21, 1001, '2025-12-09', 9, 8, 1, NOW()),
(22, 1002, '2025-12-09', 10, 8, 2, NOW()),
(23, 1003, '2025-12-10', 11, 8, 3, NOW()),
(24, 1004, '2025-12-10', 12, 8, 4, NOW()),
(25, 1005, '2025-12-11', 13, 8, 5, NOW());

-- 插入更多的异常工时记录
INSERT INTO exceptional_hours_records (id, emp_id, org_id, indicator_name, actual_value, threshold, status, period_start, period_end, created_at)
VALUES 
(16, 1001, 2, '月度加班小时', 32, 40, 'normal', '2025-12-01', '2025-12-31', NOW()),
(17, 1002, 3, '连续工作天数', 4, 5, 'normal', '2025-12-06', '2025-12-12', NOW()),
(18, 1003, 4, '月度加班小时', 38, 40, 'normal', '2025-12-01', '2025-12-31', NOW()),
(19, 1004, 5, '连续工作天数', 3, 5, 'normal', '2025-12-06', '2025-12-12', NOW()),
(20, 1005, 6, '月度加班小时', 35, 40, 'normal', '2025-12-01', '2025-12-31', NOW());

-- 插入更多的告警记录
INSERT INTO alert_record (id, emp_id, org_id, alert_type, alert_content, severity, status, created_at, processed_at, processed_by)
VALUES 
(16, 1006, 7, '正常', '一切正常', 'low', 'normal', NOW(), NULL, NULL),
(17, 1007, 8, '正常', '一切正常', 'low', 'normal', NOW(), NULL, NULL),
(18, 1008, 9, '加班超时告警', '月度加班42小时', 'medium', 'pending', NOW(), NULL, NULL),
(19, 1009, 10, '正常', '一切正常', 'low', 'normal', NOW(), NULL, NULL),
(20, 1010, 2, '加班超时告警', '月度加班48小时', 'high', 'pending', NOW(), NULL, NULL);

-- 15. 插入连续工作天数数据（更多样本）
INSERT INTO consecutive_work_days (id, emp_id, org_id, work_date, consecutive_days, is_active, created_at)
VALUES 
(16, 1001, 2, '2025-12-09', 4, 1, NOW()),
(17, 1002, 3, '2025-12-09', 5, 1, NOW()),
(18, 1003, 4, '2025-12-10', 3, 1, NOW()),
(19, 1004, 5, '2025-12-10', 2, 1, NOW()),
(20, 1005, 6, '2025-12-11', 4, 1, NOW());

-- 插入完成
SELECT '测试数据插入完成' AS message;
