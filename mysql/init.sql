-- Active: 1761145534972@@127.0.0.1@3307
CREATE TABLE IF NOT EXISTS access_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    access_time DATETIME NOT NULL,
    direction VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stay_duration (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_seconds INT NOT NULL,
    location VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建差旅表
CREATE TABLE IF NOT EXISTS travel_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    travel_date DATE NOT NULL,
    reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建排班表
CREATE TABLE IF NOT EXISTS shift_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    schedule_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建提醒表
CREATE TABLE IF NOT EXISTS alert_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    alert_date DATE NOT NULL,
    alert_time TIME NOT NULL,
    alert_message VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建连续工作天数表
CREATE TABLE IF NOT EXISTS consecutive_work_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    consecutive_days INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for testing
-- 插入更多门禁记录
INSERT INTO access_records (employee_id, access_time, direction) VALUES
('EMP001', '2024-01-01 08:00:00', 'IN'),
('EMP001', '2024-01-01 12:00:00', 'OUT'),
('EMP001', '2024-01-01 13:00:00', 'IN'),
('EMP001', '2024-01-01 18:00:00', 'OUT'),
('EMP002', '2024-01-01 09:00:00', 'IN'),
('EMP002', '2024-01-01 11:30:00', 'OUT'),
('EMP002', '2024-01-01 14:00:00', 'IN'),
('EMP002', '2024-01-01 17:00:00', 'OUT'),
('EMP003', '2024-01-01 08:30:00', 'IN'),
('EMP003', '2024-01-01 10:00:00', 'OUT'),
('EMP003', '2024-01-01 10:45:00', 'IN'),
('EMP003', '2024-01-01 18:30:00', 'OUT'),
('EMP004', '2024-01-01 09:15:00', 'IN'),
('EMP004', '2024-01-01 12:00:00', 'OUT'),
('EMP004', '2024-01-01 13:30:00', 'IN'),
('EMP004', '2024-01-01 16:45:00', 'OUT');

-- 插入排班记录
INSERT INTO shift_schedule (employee_id, schedule_date, shift_type, start_time, end_time) VALUES
('EMP001', '2024-01-01', 'FULL_DAY', '08:00:00', '18:00:00'),
('EMP002', '2024-01-01', 'FULL_DAY', '09:00:00', '17:00:00'),
('EMP003', '2024-01-01', 'FULL_DAY', '08:30:00', '18:30:00'),
('EMP004', '2024-01-01', 'FULL_DAY', '09:00:00', '17:00:00');

-- 插入差旅记录
INSERT INTO travel_records (employee_id, travel_date, reason) VALUES
('EMP001', '2024-01-02', '客户拜访'),
('EMP003', '2024-01-01', '培训');


-- 继续使用access_db数据库
USE access_db;

-- =========================================
-- 1. 排班表 hrbp_schedule_shift
-- =========================================
DROP TABLE IF EXISTS hrbp_schedule_shift;
CREATE TABLE hrbp_schedule_shift (
    shift_id    BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 排班记录ID
    emp_id      BIGINT NOT NULL,                    -- 员工ID
    start_time  DATETIME NOT NULL,                  -- 排班开始时间
    end_time    DATETIME NOT NULL,                  -- 排班结束时间
    remark      VARCHAR(200) NULL,
    KEY idx_emp_time (emp_id, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- 2. 门禁表 hrbp_gate_record
-- =========================================
DROP TABLE IF EXISTS hrbp_gate_record;
CREATE TABLE hrbp_gate_record (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    emp_id      BIGINT NOT NULL,
    start_time  DATETIME NOT NULL,     -- 进入园区/办公区的时间
    end_time    DATETIME NOT NULL,     -- 离开园区/办公区的时间
    device_id   VARCHAR(50) NULL,
    KEY idx_emp_time (emp_id, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- 3. 请假表 hrbp_leave_record
-- =========================================
DROP TABLE IF EXISTS hrbp_leave_record;
CREATE TABLE hrbp_leave_record (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    emp_id      BIGINT NOT NULL,
    start_time  DATETIME NOT NULL,     -- 请假开始
    end_time    DATETIME NOT NULL,     -- 请假结束
    leave_type  VARCHAR(50) NULL,      -- 事假/病假/年假等
    KEY idx_emp_time (emp_id, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- 4. 出差表 hrbp_trip_record
-- =========================================
DROP TABLE IF EXISTS hrbp_trip_record;
CREATE TABLE hrbp_trip_record (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    emp_id      BIGINT NOT NULL,
    start_time  DATETIME NOT NULL,     -- 出差开始
    end_time    DATETIME NOT NULL,     -- 出差结束
    destination VARCHAR(100) NULL,     -- 出差城市
    KEY idx_emp_time (emp_id, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- 5. 存储最终缺勤结果的表 hrbp_absence_result
--    （供 Flink SQL 写入）
-- =========================================
DROP TABLE IF EXISTS hrbp_absence_result;
CREATE TABLE hrbp_absence_result (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    emp_id       BIGINT       NOT NULL,       -- 员工ID
    shift_id     BIGINT       NOT NULL,       -- 对应排班ID
    gap_start    DATETIME     NOT NULL,       -- 缺勤开始
    gap_end      DATETIME     NOT NULL,       -- 缺勤结束
    gap_minutes  INT          NOT NULL,       -- 缺勤时长（分钟）
    calc_date    DATE         NOT NULL,       -- 统计日期（一般填排班日期）
    create_time  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_emp_shift (emp_id, shift_id),
    KEY idx_calc_date (calc_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- 6. 插入测试数据
--    员工：1001、1002
-- =========================================

-- ========== 排班数据 ==========
INSERT INTO hrbp_schedule_shift (emp_id, start_time, end_time, remark)
VALUES
-- 员工 1001：一天正常排班
(1001, '2025-01-10 09:00:00', '2025-01-10 18:00:00', '1001-普通白班'),
-- 员工 1001：第二天排班（有出差）
(1001, '2025-01-11 09:00:00', '2025-01-11 18:00:00', '1001-出差当天'),
-- 员工 1002：一天排班（门禁完整覆盖）
(1002, '2025-01-10 09:00:00', '2025-01-10 18:00:00', '1002-正常在岗'),
-- 员工 1002：一天排班（中间请假）
(1002, '2025-01-11 09:00:00', '2025-01-11 18:00:00', '1002-中间请假');

-- ========== 门禁数据 ==========
INSERT INTO hrbp_gate_record (emp_id, start_time, end_time, device_id)
VALUES
-- 员工 1001，2025-01-10
-- 早上在，11:50 离开；12:40 回来，中间 50 分钟门禁外（无请假/出差）→ 应算缺勤 > 30 分钟
(1001, '2025-01-10 08:55:00', '2025-01-10 11:50:00', 'GATE-A'),
(1001, '2025-01-10 12:40:00', '2025-01-10 18:05:00', 'GATE-A'),

-- 员工 1001，2025-01-11（有出差：10:00-17:00）
-- 9:00-10:00 在公司，17:00-18:00 在公司，10:00-17:00 门禁外但被出差覆盖 → 不算缺勤
(1001, '2025-01-11 09:00:00', '2025-01-11 10:00:00', 'GATE-A'),
(1001, '2025-01-11 17:00:00', '2025-01-11 18:00:00', 'GATE-A'),

-- 员工 1002，2025-01-10
-- 门禁完整覆盖排班（无缺勤）
(1002, '2025-01-10 08:50:00', '2025-01-10 18:10:00', 'GATE-B'),

-- 员工 1002，2025-01-11
-- 上午在公司，13:00-15:00 请假，15:00 回公司
-- 门禁两段：9:00-13:00, 15:00-18:00
(1002, '2025-01-11 09:00:00', '2025-01-11 13:00:00', 'GATE-B'),
(1002, '2025-01-11 15:00:00', '2025-01-11 18:00:00', 'GATE-B');

-- ========== 请假数据 ==========
INSERT INTO hrbp_leave_record (emp_id, start_time, end_time, leave_type)
VALUES
-- 员工 1002：2025-01-11 中间请假 13:00-15:00
(1002, '2025-01-11 13:00:00', '2025-01-11 15:00:00', '事假');

-- 员工 1001：2025-01-10 / 01-11 无请假，不插记录

-- ========== 出差数据 ==========
INSERT INTO hrbp_trip_record (emp_id, start_time, end_time, destination)
VALUES
-- 员工 1001：2025-01-11 出差 10:00-17:00
(1001, '2025-01-11 10:00:00', '2025-01-11 17:00:00', '北京');
