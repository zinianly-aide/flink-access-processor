package com.example;

import org.apache.flink.table.api.EnvironmentSettings;
import org.apache.flink.table.api.TableEnvironment;

public class AccessRecordProcessor {

    public static void main(String[] args) {
        // 创建TableEnvironment
        EnvironmentSettings settings = EnvironmentSettings.inBatchMode();
        TableEnvironment tableEnv = TableEnvironment.create(settings);

        // 注册MySQL源表（access_records）
        tableEnv.executeSql("""
            CREATE TABLE access_records (
                id INT,
                employee_id STRING,
                access_time TIMESTAMP,
                direction STRING,
                created_at TIMESTAMP
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'access_records'
            )
        """);

        // 注册MySQL结果表（stay_duration）
        tableEnv.executeSql("""
            CREATE TABLE stay_duration (
                employee_id STRING,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                duration_seconds INT,
                location STRING
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'stay_duration'
            )
        """);

        // 注册差旅表
        tableEnv.executeSql("""
            CREATE TABLE travel_records (
                id INT,
                employee_id STRING,
                travel_date DATE,
                reason STRING,
                created_at TIMESTAMP
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'travel_records'
            )
        """);

        // 注册排班表
        tableEnv.executeSql("""
            CREATE TABLE shift_schedule (
                id INT,
                employee_id STRING,
                schedule_date DATE,
                shift_type STRING,
                start_time TIME,
                end_time TIME,
                created_at TIMESTAMP
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'shift_schedule'
            )
        """);

        // 注册提醒表
        tableEnv.executeSql("""
            CREATE TABLE alert_records (
                employee_id STRING,
                alert_date DATE,
                alert_time TIME,
                alert_message STRING
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'alert_records'
            )
        """);

        // 注册排班表（a）
        tableEnv.executeSql("""
            CREATE TABLE schedule_a (
                shift_id    BIGINT,           -- 排班记录ID
                emp_id      BIGINT,
                start_time  TIMESTAMP(3),
                end_time    TIMESTAMP(3)
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'hrbp_schedule_shift'
            )
        """);

        // 注册门禁表（b）
        tableEnv.executeSql("""
            CREATE TABLE gate_b (
                emp_id      BIGINT,
                start_time  TIMESTAMP(3),     -- 在场开始
                end_time    TIMESTAMP(3)     -- 在场结束
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'hrbp_gate_record'
            )
        """);

        // 注册请假表（c）
        tableEnv.executeSql("""
            CREATE TABLE leave_c (
                emp_id      BIGINT,
                start_time  TIMESTAMP(3),     -- 请假开始
                end_time    TIMESTAMP(3)     -- 请假结束
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'hrbp_leave_record'
            )
        """);

        // 注册出差表（d）
        tableEnv.executeSql("""
            CREATE TABLE trip_d (
                emp_id      BIGINT,
                start_time  TIMESTAMP(3),     -- 出差开始
                end_time    TIMESTAMP(3)     -- 出差结束
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'hrbp_trip_record'
            )
        """);

        // 创建hrbp_absence_result结果表
        tableEnv.executeSql("""
            CREATE TABLE hrbp_absence_result (
                emp_id BIGINT,
                shift_id BIGINT,
                gap_start TIMESTAMP(3),
                gap_end TIMESTAMP(3),
                gap_minutes INT,
                calc_date DATE
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'hrbp_absence_result'
            )
        """);

        // 处理逻辑1：计算停留时间
        tableEnv.executeSql("""
            INSERT INTO hrbp_absence_result
            WITH
-- 1) 排班基表
work_slot AS (
    SELECT
        shift_id,
        emp_id,
        start_time,
        end_time
    FROM schedule_a
),

-- 2) 把 门禁 + 请假 + 出差 都裁剪到排班里，组成“覆盖区间”原始集合
covered_raw AS (

    -- 2.1 门禁覆盖：证明人在现场
    SELECT
        s.shift_id,
        s.emp_id,
        GREATEST(g.start_time, s.start_time) AS start_time,
        LEAST(g.end_time,   s.end_time)     AS end_time
    FROM work_slot s
    JOIN gate_b g
      ON g.emp_id      = s.emp_id
     AND g.start_time  < s.end_time     -- 有交集
     AND g.end_time    > s.start_time

    UNION ALL

    -- 2.2 请假覆盖：合法不在现场
    SELECT
        s.shift_id,
        s.emp_id,
        GREATEST(l.start_time, s.start_time) AS start_time,
        LEAST(l.end_time,   s.end_time)      AS end_time
    FROM work_slot s
    JOIN leave_c l
      ON l.emp_id      = s.emp_id
     AND l.start_time  < s.end_time
     AND l.end_time    > s.start_time

    UNION ALL

    -- 2.3 出差覆盖：也是合法不在现场
    SELECT
        s.shift_id,
        s.emp_id,
        GREATEST(t.start_time, s.start_time) AS start_time,
        LEAST(t.end_time,   s.end_time)      AS end_time
    FROM work_slot s
    JOIN trip_d t
      ON t.emp_id      = s.emp_id
     AND t.start_time  < s.end_time
     AND t.end_time    > s.start_time
),

-- 3) 对同一员工、同一班次内的覆盖区间排序，准备合并
ordered AS (
    SELECT
        cr.*,
        LAG(cr.end_time) OVER (
            PARTITION BY cr.emp_id, cr.shift_id
            ORDER BY cr.start_time
        ) AS prev_end
    FROM covered_raw cr
),

-- 4) 打“新组标记”，把重叠 / 相连的覆盖段合并成不重叠的区间
marked AS (
    SELECT
        o.*,
        CASE
            WHEN o.prev_end IS NULL
                 OR o.start_time > o.prev_end   -- 与上一个不相交
            THEN 1
            ELSE 0
        END AS grp_flag
    FROM ordered o
),

merged AS (
    SELECT
        shift_id,
        emp_id,
        MIN(start_time) AS start_time,
        MAX(end_time)   AS end_time
    FROM (
        SELECT
            m.*,
            -- 累加 grp_flag 得到组号
            SUM(grp_flag) OVER (
                PARTITION BY m.emp_id, m.shift_id
                ORDER BY m.start_time
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS grp
        FROM marked m
    ) t
    GROUP BY shift_id, emp_id, grp
),

-- 5) 基于“排班区间 - 合并后的覆盖区间”求出所有空档
gaps AS (

    -- 5.1 排班前缀空档：排班开始 -> 第一段覆盖开始
    SELECT
        s.shift_id,
        s.emp_id,
        s.start_time AS gap_start,
        mf.start_time AS gap_end
    FROM work_slot s
    JOIN (
        SELECT *
        FROM (
            SELECT
                m.*,
                ROW_NUMBER() OVER (
                    PARTITION BY m.emp_id, m.shift_id
                    ORDER BY m.start_time
                ) AS rn
            FROM merged m
        ) x
        WHERE rn = 1
    ) mf
      ON mf.shift_id = s.shift_id
     AND mf.emp_id   = s.emp_id
    WHERE s.start_time < mf.start_time

    UNION ALL

    -- 5.2 覆盖区间之间的空档：前一段覆盖结束 -> 下一段覆盖开始
    SELECT
        s.shift_id,
        s.emp_id,
        mp.end_time   AS gap_start,
        mn.start_time AS gap_end
    FROM work_slot s
    JOIN merged mn
      ON mn.shift_id = s.shift_id
     AND mn.emp_id   = s.emp_id
    JOIN merged mp
      ON mp.shift_id = s.shift_id
     AND mp.emp_id   = s.emp_id
     AND mp.end_time < mn.start_time
    -- 只保留“最近的前一个覆盖段”
    WHERE mp.end_time = (
        SELECT MAX(m2.end_time)
        FROM merged m2
        WHERE m2.shift_id = s.shift_id
          AND m2.emp_id   = s.emp_id
          AND m2.end_time < mn.start_time
    )

    UNION ALL

    -- 5.3 尾部空档：最后一段覆盖结束 -> 排班结束
    SELECT
        s.shift_id,
        s.emp_id,
        ml.end_time AS gap_start,
        s.end_time  AS gap_end
    FROM work_slot s
    JOIN (
        SELECT *
        FROM (
            SELECT
                m.*,
                ROW_NUMBER() OVER (
                    PARTITION BY m.emp_id, m.shift_id
                    ORDER BY m.start_time DESC
                ) AS rn
            FROM merged m
        ) x
        WHERE rn = 1
    ) ml
      ON ml.shift_id = s.shift_id
     AND ml.emp_id   = s.emp_id
    WHERE ml.end_time < s.end_time

    UNION ALL

    -- 5.4 完全没有门禁/请假/出差覆盖的班次：整个排班都是空档
    SELECT
        s.shift_id,
        s.emp_id,
        s.start_time AS gap_start,
        s.end_time   AS gap_end
    FROM work_slot s
    LEFT JOIN merged m
      ON m.shift_id = s.shift_id
     AND m.emp_id   = s.emp_id
    WHERE m.shift_id IS NULL
),

-- 6) 只保留空档 > 30 分钟的“缺勤”
long_gaps AS (
    SELECT
        g.shift_id,
        g.emp_id,
        g.gap_start,
        g.gap_end,
        TIMESTAMPDIFF(MINUTE, g.gap_start, g.gap_end) AS gap_minutes
    FROM gaps g
    WHERE TIMESTAMPDIFF(MINUTE, g.gap_start, g.gap_end) > 30
)

-- 7) 最终结果：排班内 未请假 且 门禁外停留 > 30 分钟，且已排除出差的缺勤
SELECT
    emp_id,
    shift_id,
    gap_start,
    gap_end,
    gap_minutes,
    CAST(gap_start AS DATE) AS calc_date
FROM long_gaps;

        """);

        // 处理逻辑2：生成提醒记录
        tableEnv.executeSql("""
            INSERT INTO alert_records
            SELECT 
                s.employee_id,
                s.schedule_date AS alert_date,
                CURRENT_TIME AS alert_time,
                CONCAT('员工 ', s.employee_id, ' 当日有排班且在门禁外时间超过30分钟且无差旅记录') AS alert_message
            FROM (
                SELECT 
                    employee_id,
                    CAST(start_time AS DATE) AS record_date,
                    SUM(CASE WHEN location = 'OUTSIDE' THEN duration_seconds ELSE 0 END) AS total_outside_seconds
                FROM stay_duration
                GROUP BY employee_id, CAST(start_time AS DATE)
                HAVING SUM(CASE WHEN location = 'OUTSIDE' THEN duration_seconds ELSE 0 END) > 1800 -- 30分钟 = 1800秒
            ) outside_time
            JOIN shift_schedule s ON 
                outside_time.employee_id = s.employee_id AND 
                outside_time.record_date = s.schedule_date
            LEFT JOIN travel_records t ON 
                outside_time.employee_id = t.employee_id AND 
                outside_time.record_date = t.travel_date
            WHERE t.id IS NULL -- 无差旅记录
        """);

        // 处理逻辑3：计算连续工作天数
        // 注册连续工作天数表
        tableEnv.executeSql("""
            CREATE TABLE consecutive_work_days (
                employee_id STRING,
                consecutive_days INT,
                start_date DATE,
                end_date DATE
            ) WITH (
                'connector' = 'jdbc',
                'url' = 'jdbc:mysql://mysql:3306/access_db?useSSL=false&allowPublicKeyRetrieval=true',
                'username' = 'root',
                'password' = 'root_password',
                'table-name' = 'consecutive_work_days'
            )
        """);

        // 计算连续工作天数 - 完整逻辑
        // 1. 确定每个员工的工作日期
        // 2. 计算相邻工作日期的间隔
        // 3. 标记连续工作的分组
        // 4. 统计每组的连续天数
        tableEnv.executeSql("""
            INSERT INTO consecutive_work_days
            SELECT
                employee_id,
                CAST(MAX(consecutive_group_days) AS INT) AS consecutive_days,
                MIN(work_date) AS start_date,
                MAX(work_date) AS end_date
            FROM (
                SELECT
                    employee_id,
                    work_date,
                    consecutive_group,
                    COUNT(*) OVER (PARTITION BY employee_id, consecutive_group ORDER BY work_date) AS consecutive_group_days
                FROM (
                    SELECT
                        employee_id,
                        work_date,
                        SUM(is_new_sequence) OVER (PARTITION BY employee_id ORDER BY work_date) AS consecutive_group
                    FROM (
                        SELECT
                            employee_id,
                            work_date,
                            LAG(work_date) OVER (PARTITION BY employee_id ORDER BY work_date) AS prev_work_date,
                            CASE
                                WHEN LAG(work_date) OVER (PARTITION BY employee_id ORDER BY work_date) IS NULL THEN 1
                                WHEN TIMESTAMPDIFF(DAY, 
                                                   CAST(LAG(work_date) OVER (PARTITION BY employee_id ORDER BY work_date) AS TIMESTAMP), 
                                                   CAST(work_date AS TIMESTAMP)) > 1 THEN 1
                                ELSE 0
                            END AS is_new_sequence
                        FROM (
                            -- 获取每个员工的工作日期（有进入记录的日期）
                            SELECT DISTINCT
                                employee_id,
                                CAST(access_time AS DATE) AS work_date
                            FROM access_records
                            WHERE direction = 'IN'
                        ) distinct_work_dates
                    ) sequence_markers
                ) grouped_sequences
            ) sequence_counts
            GROUP BY employee_id
            HAVING MAX(consecutive_group_days) > 6
        """);

        System.out.println("Access record processing completed successfully!");
    }
}