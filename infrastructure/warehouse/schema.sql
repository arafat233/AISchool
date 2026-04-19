-- ============================================================
-- Data Warehouse Schema — Star schema for School ERP analytics
-- Target: PostgreSQL (prod: Snowflake/BigQuery compatible DDL)
-- ============================================================

-- ── Dimension Tables ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dim_school (
    school_key       SERIAL PRIMARY KEY,
    school_id        TEXT NOT NULL UNIQUE,
    school_name      TEXT,
    city             TEXT,
    state            TEXT,
    board_type       TEXT,    -- CBSE/ICSE/STATE/IB
    plan             TEXT,    -- BASIC/STANDARD/PREMIUM/ENTERPRISE
    loaded_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dim_date (
    date_key         INT PRIMARY KEY,   -- YYYYMMDD integer
    full_date        DATE NOT NULL,
    day_of_week      INT,               -- 0=Sun
    day_name         TEXT,
    week_of_year     INT,
    month_num        INT,
    month_name       TEXT,
    quarter          INT,
    academic_year    TEXT,              -- e.g. "2025-26"
    is_holiday       BOOLEAN DEFAULT FALSE,
    is_exam_day      BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS dim_student (
    student_key      SERIAL PRIMARY KEY,
    student_id       TEXT NOT NULL,
    school_key       INT REFERENCES dim_school(school_key),
    full_name        TEXT,
    gender           TEXT,
    class_name       TEXT,
    grade_level      INT,
    admission_year   INT,
    status           TEXT,             -- ACTIVE/LEFT/GRADUATED
    valid_from       DATE,
    valid_to         DATE,             -- SCD type 2
    is_current       BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS dim_staff (
    staff_key        SERIAL PRIMARY KEY,
    staff_id         TEXT NOT NULL,
    school_key       INT REFERENCES dim_school(school_key),
    full_name        TEXT,
    role             TEXT,
    department       TEXT,
    subject          TEXT,
    is_current       BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS dim_class (
    class_key        SERIAL PRIMARY KEY,
    class_id         TEXT NOT NULL,
    school_key       INT REFERENCES dim_school(school_key),
    class_name       TEXT,
    grade_level      INT,
    academic_year    TEXT,
    section          TEXT
);

CREATE TABLE IF NOT EXISTS dim_subject (
    subject_key      SERIAL PRIMARY KEY,
    subject_id       TEXT NOT NULL,
    subject_name     TEXT,
    category         TEXT             -- CORE/ELECTIVE/LANGUAGE/ACTIVITY
);

-- ── Fact Tables ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fact_attendance (
    attendance_key   BIGSERIAL PRIMARY KEY,
    date_key         INT REFERENCES dim_date(date_key),
    school_key       INT REFERENCES dim_school(school_key),
    student_key      INT REFERENCES dim_student(student_key),
    class_key        INT REFERENCES dim_class(class_key),
    status           TEXT,            -- PRESENT/ABSENT/LATE/HALF_DAY
    source           TEXT,            -- MANUAL/BIOMETRIC/AUTO
    is_present       INT GENERATED ALWAYS AS (CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) STORED,
    loaded_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fact_fee (
    fee_key          BIGSERIAL PRIMARY KEY,
    date_key         INT REFERENCES dim_date(date_key),
    school_key       INT REFERENCES dim_school(school_key),
    student_key      INT REFERENCES dim_student(student_key),
    invoice_id       TEXT,
    billed_rs        NUMERIC(12,2),
    collected_rs     NUMERIC(12,2),
    outstanding_rs   NUMERIC(12,2) GENERATED ALWAYS AS (billed_rs - collected_rs) STORED,
    fee_head         TEXT,
    payment_mode     TEXT,
    is_paid          INT,             -- 1/0
    days_overdue     INT DEFAULT 0,
    loaded_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fact_exam (
    exam_key         BIGSERIAL PRIMARY KEY,
    date_key         INT REFERENCES dim_date(date_key),
    school_key       INT REFERENCES dim_school(school_key),
    student_key      INT REFERENCES dim_student(student_key),
    class_key        INT REFERENCES dim_class(class_key),
    subject_key      INT REFERENCES dim_subject(subject_key),
    exam_type        TEXT,            -- UNIT_TEST/MID_TERM/FINAL/BOARD
    marks_obtained   NUMERIC(6,2),
    max_marks        NUMERIC(6,2),
    percentage       NUMERIC(5,2),
    grade            TEXT,
    is_passed        INT,
    loaded_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fact_lms_activity (
    activity_key     BIGSERIAL PRIMARY KEY,
    date_key         INT REFERENCES dim_date(date_key),
    school_key       INT REFERENCES dim_school(school_key),
    student_key      INT REFERENCES dim_student(student_key),
    course_id        TEXT,
    lesson_id        TEXT,
    minutes_spent    INT,
    progress_pct     NUMERIC(5,2),
    completed        INT,
    loaded_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fact_finance (
    finance_key      BIGSERIAL PRIMARY KEY,
    date_key         INT REFERENCES dim_date(date_key),
    school_key       INT REFERENCES dim_school(school_key),
    category         TEXT,           -- FEE_INCOME/PAYROLL/EXPENSE/SCHOLARSHIP
    sub_category     TEXT,
    credit_rs        NUMERIC(14,2) DEFAULT 0,
    debit_rs         NUMERIC(14,2) DEFAULT 0,
    net_rs           NUMERIC(14,2) GENERATED ALWAYS AS (credit_rs - debit_rs) STORED,
    loaded_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Analytical Views ─────────────────────────────────────────

CREATE OR REPLACE VIEW v_daily_attendance_summary AS
SELECT
    dd.full_date,
    ds.school_name,
    dc.class_name,
    COUNT(*) AS total_students,
    SUM(fa.is_present) AS present_count,
    ROUND(100.0 * SUM(fa.is_present) / NULLIF(COUNT(*), 0), 1) AS attendance_pct
FROM fact_attendance fa
JOIN dim_date dd ON dd.date_key = fa.date_key
JOIN dim_school ds ON ds.school_key = fa.school_key
JOIN dim_class dc ON dc.class_key = fa.class_key
GROUP BY dd.full_date, ds.school_name, dc.class_name;

CREATE OR REPLACE VIEW v_monthly_fee_summary AS
SELECT
    TO_CHAR(dd.full_date, 'YYYY-MM') AS month,
    ds.school_name,
    SUM(ff.billed_rs) AS billed_rs,
    SUM(ff.collected_rs) AS collected_rs,
    SUM(ff.outstanding_rs) AS outstanding_rs,
    ROUND(100.0 * SUM(ff.collected_rs) / NULLIF(SUM(ff.billed_rs), 0), 1) AS collection_rate_pct
FROM fact_fee ff
JOIN dim_date dd ON dd.date_key = ff.date_key
JOIN dim_school ds ON ds.school_key = ff.school_key
GROUP BY TO_CHAR(dd.full_date, 'YYYY-MM'), ds.school_name;

CREATE OR REPLACE VIEW v_subject_performance AS
SELECT
    ds.school_name,
    dc.class_name,
    dsub.subject_name,
    COUNT(*) AS student_count,
    ROUND(AVG(fe.percentage), 1) AS avg_score_pct,
    ROUND(100.0 * SUM(fe.is_passed) / NULLIF(COUNT(*), 0), 1) AS pass_rate_pct
FROM fact_exam fe
JOIN dim_school ds ON ds.school_key = fe.school_key
JOIN dim_class dc ON dc.class_key = fe.class_key
JOIN dim_subject dsub ON dsub.subject_key = fe.subject_key
GROUP BY ds.school_name, dc.class_name, dsub.subject_name;
