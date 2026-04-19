/**
 * Nightly ETL Pipeline — Operational DB → Data Warehouse
 *
 * Runs as a cron job (node-schedule) or can be triggered manually.
 * Uses incremental loads based on `loaded_at` watermark in each fact table.
 *
 * Schedule: daily at 02:00 AM
 */
import { Pool } from "pg";
import schedule from "node-schedule";

const OPS_DB = new Pool({ connectionString: process.env.DATABASE_URL });
const DW_DB = new Pool({ connectionString: process.env.WAREHOUSE_DATABASE_URL ?? process.env.DATABASE_URL });

async function log(msg: string) {
  console.log(`[ETL ${new Date().toISOString()}] ${msg}`);
}

// ── Dimension Upserts ─────────────────────────────────────────────────────────

async function loadDimSchool() {
  await DW_DB.query(`
    INSERT INTO dim_school (school_id, school_name, city, state, board_type, plan)
    SELECT id, name, city, state, board_type, plan
    FROM schools
    ON CONFLICT (school_id) DO UPDATE SET
      school_name = EXCLUDED.school_name,
      plan = EXCLUDED.plan
  `);
  log("dim_school loaded");
}

async function loadDimDate(year: number) {
  // Generate date dimension for the given year if not already present
  await DW_DB.query(`
    INSERT INTO dim_date (date_key, full_date, day_of_week, day_name, week_of_year, month_num, month_name, quarter, academic_year)
    SELECT
      TO_CHAR(d::DATE, 'YYYYMMDD')::INT,
      d::DATE,
      EXTRACT(DOW FROM d)::INT,
      TO_CHAR(d, 'Day'),
      EXTRACT(WEEK FROM d)::INT,
      EXTRACT(MONTH FROM d)::INT,
      TO_CHAR(d, 'Month'),
      EXTRACT(QUARTER FROM d)::INT,
      CASE WHEN EXTRACT(MONTH FROM d) >= 4
        THEN EXTRACT(YEAR FROM d)::TEXT || '-' || (EXTRACT(YEAR FROM d) + 1 - 2000)::TEXT
        ELSE (EXTRACT(YEAR FROM d) - 1)::TEXT || '-' || (EXTRACT(YEAR FROM d) - 2000)::TEXT
      END
    FROM generate_series('${year}-01-01'::date, '${year}-12-31'::date, '1 day') d
    ON CONFLICT (date_key) DO NOTHING
  `);
  log(`dim_date loaded for year ${year}`);
}

async function loadDimStudents() {
  await DW_DB.query(`
    INSERT INTO dim_student (student_id, school_key, full_name, gender, class_name, grade_level, admission_year, status)
    SELECT
      s.id,
      ds.school_key,
      s.full_name,
      s.gender,
      cl.name,
      cl.grade_level,
      s.admission_year,
      s.status
    FROM students s
    JOIN classes cl ON cl.id = s.class_id
    JOIN dim_school ds ON ds.school_id = s.school_id
    ON CONFLICT DO NOTHING
  `);
  log("dim_student loaded");
}

// ── Fact Incremental Loads ────────────────────────────────────────────────────

async function loadFactAttendance(since: Date) {
  const { rowCount } = await DW_DB.query(`
    INSERT INTO fact_attendance (date_key, school_key, student_key, class_key, status, source)
    SELECT
      TO_CHAR(ar.date, 'YYYYMMDD')::INT,
      ds.school_key,
      dst.student_key,
      dc.class_key,
      ar.status,
      COALESCE(ar.source, 'MANUAL')
    FROM attendance_records ar
    JOIN students s ON s.id = ar.student_id
    JOIN dim_school ds ON ds.school_id = s.school_id
    JOIN dim_student dst ON dst.student_id = s.id AND dst.is_current = true
    JOIN dim_class dc ON dc.class_id = s.class_id
    WHERE ar.created_at >= $1
    ON CONFLICT DO NOTHING
  `, [since]);
  log(`fact_attendance: ${rowCount} rows loaded`);
}

async function loadFactFee(since: Date) {
  const { rowCount } = await DW_DB.query(`
    INSERT INTO fact_fee (date_key, school_key, student_key, invoice_id, billed_rs, collected_rs, fee_head, payment_mode, is_paid, days_overdue)
    SELECT
      TO_CHAR(fi.due_date, 'YYYYMMDD')::INT,
      ds.school_key,
      dst.student_key,
      fi.id,
      fi.amount_rs,
      COALESCE(SUM(fp.amount_rs), 0),
      fh.name,
      MAX(fp.mode),
      CASE WHEN fi.status = 'PAID' THEN 1 ELSE 0 END,
      GREATEST(0, EXTRACT(DAY FROM NOW() - fi.due_date)::INT)
    FROM fee_invoices fi
    JOIN students s ON s.id = fi.student_id
    JOIN dim_school ds ON ds.school_id = fi.school_id
    JOIN dim_student dst ON dst.student_id = s.id AND dst.is_current = true
    LEFT JOIN fee_heads fh ON fh.id = fi.fee_head_id
    LEFT JOIN fee_payments fp ON fp.invoice_id = fi.id
    WHERE fi.updated_at >= $1
    GROUP BY fi.id, ds.school_key, dst.student_key, fh.name, fi.amount_rs, fi.status, fi.due_date
    ON CONFLICT DO NOTHING
  `, [since]);
  log(`fact_fee: ${rowCount} rows loaded`);
}

async function loadFactExam(since: Date) {
  const { rowCount } = await DW_DB.query(`
    INSERT INTO fact_exam (date_key, school_key, student_key, class_key, subject_key, exam_type, marks_obtained, max_marks, percentage, grade, is_passed)
    SELECT
      TO_CHAR(e.date, 'YYYYMMDD')::INT,
      ds.school_key,
      dst.student_key,
      dc.class_key,
      dsub.subject_key,
      e.exam_type,
      er.marks_obtained,
      e.max_marks,
      er.percentage,
      er.grade,
      CASE WHEN er.percentage >= 33 THEN 1 ELSE 0 END
    FROM exam_results er
    JOIN exams e ON e.id = er.exam_id
    JOIN students s ON s.id = er.student_id
    JOIN dim_school ds ON ds.school_id = s.school_id
    JOIN dim_student dst ON dst.student_id = s.id AND dst.is_current = true
    JOIN dim_class dc ON dc.class_id = s.class_id
    JOIN dim_subject dsub ON dsub.subject_id = e.subject_id
    WHERE er.created_at >= $1
    ON CONFLICT DO NOTHING
  `, [since]);
  log(`fact_exam: ${rowCount} rows loaded`);
}

// ── Main ETL Run ──────────────────────────────────────────────────────────────

async function runETL() {
  log("=== ETL run starting ===");
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  try {
    await loadDimSchool();
    await loadDimDate(now.getFullYear());
    await loadDimStudents();
    await loadFactAttendance(yesterday);
    await loadFactFee(yesterday);
    await loadFactExam(yesterday);
    log("=== ETL run complete ===");
  } catch (err) {
    console.error("[ETL] Run failed:", err);
  }
}

// Schedule: 02:00 AM daily
schedule.scheduleJob("0 2 * * *", runETL);
log("ETL scheduler started — runs at 02:00 AM daily");

// Allow manual trigger via: node etl.js --run-now
if (process.argv.includes("--run-now")) {
  runETL().then(() => process.exit(0));
}
