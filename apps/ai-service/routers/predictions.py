"""
Predictive models:
  - Dropout risk       (attendance + marks + fee payment + LMS engagement → classification)
  - Fee defaulter      (payment history + fee amount → classification)
  - Grade forecast     (mid-term marks + attendance + assignment submission → regression)
  - Teacher effectiveness (teacher-class mapping → exam performance correlation)
  - Enrolment forecast (enquiry volume + historical conversion → regression)
  - Financial forecast (fee income, payroll, cash flow → month-by-month)
  - Parent engagement score (logins, payments, PTM, surveys → composite score)
  - Teacher workload   (periods + students + duties → composite score)
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import numpy as np
from services.db import get_db

router = APIRouter()

# ─── Dropout Risk ──────────────────────────────────────────────────────────────

class DropoutInput(BaseModel):
    school_id: str
    student_id: str | None = None   # None = compute for all students in school

class StudentRiskScore(BaseModel):
    student_id: str
    name: str
    roll_no: str
    class_name: str
    risk_score: float          # 0–100
    risk_level: str            # LOW / MEDIUM / HIGH
    factors: dict


@router.post("/dropout", response_model=list[StudentRiskScore])
async def predict_dropout(req: DropoutInput, db: AsyncSession = Depends(get_db)):
    """
    Risk = weighted sum of:
      attendance_deficit × 35
      fee_default_rate   × 25
      lms_inactivity     × 20
      exam_below_pass    × 20
    """
    where = "a.school_id = :school_id" + (" AND s.id = :student_id" if req.student_id else "")
    params: dict = {"school_id": req.school_id}
    if req.student_id:
        params["student_id"] = req.student_id

    rows = await db.execute(text(f"""
        SELECT
            s.id,
            s.full_name,
            s.roll_no,
            cl.name  AS class_name,

            -- Attendance % last 90 days
            COALESCE(
              100.0 * SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(ar.id), 0),
              0
            ) AS attendance_pct,

            -- Fee default rate
            COALESCE(
              100.0 * SUM(CASE WHEN fi.status IN ('UNPAID','PARTIAL') THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(fi.id), 0),
              0
            ) AS fee_default_rate,

            -- LMS inactivity days (days since last lesson completion)
            COALESCE(
              EXTRACT(EPOCH FROM (NOW() - MAX(lp.completed_at))) / 86400,
              90
            ) AS lms_inactive_days,

            -- Below-pass exam count
            COALESCE(
              SUM(CASE WHEN er.percentage < 40 THEN 1 ELSE 0 END),
              0
            ) AS below_pass_count

        FROM students s
        JOIN classes cl ON cl.id = s.class_id
        LEFT JOIN attendance_records ar ON ar.student_id = s.id
            AND ar.date >= NOW() - INTERVAL '90 days'
        LEFT JOIN fee_invoices fi ON fi.student_id = s.id
        LEFT JOIN lesson_progress lp ON lp.student_id = s.id
        LEFT JOIN exam_results er ON er.student_id = s.id
        JOIN academic_sessions acs ON acs.id = s.academic_session_id
            AND acs.school_id = :school_id
        WHERE {where}
        GROUP BY s.id, s.full_name, s.roll_no, cl.name
    """), params)

    result = []
    for row in rows.mappings():
        att_deficit = max(0, 75 - float(row["attendance_pct"]))
        fee_def = float(row["fee_default_rate"])
        lms_score = min(float(row["lms_inactive_days"]), 90) / 90 * 100
        exam_score = min(float(row["below_pass_count"]), 5) / 5 * 100

        risk = (att_deficit / 75 * 35) + (fee_def / 100 * 25) + (lms_score / 100 * 20) + (exam_score / 100 * 20)
        risk = round(min(risk, 100), 1)

        result.append(StudentRiskScore(
            student_id=row["id"],
            name=row["full_name"],
            roll_no=row["roll_no"],
            class_name=row["class_name"],
            risk_score=risk,
            risk_level="HIGH" if risk >= 65 else ("MEDIUM" if risk >= 35 else "LOW"),
            factors={
                "attendance_pct": round(float(row["attendance_pct"]), 1),
                "fee_default_rate_pct": round(fee_def, 1),
                "lms_inactive_days": round(float(row["lms_inactive_days"]), 0),
                "below_pass_exams": int(row["below_pass_count"]),
            },
        ))
    result.sort(key=lambda x: x.risk_score, reverse=True)
    return result


# ─── Grade Forecast ───────────────────────────────────────────────────────────

class GradeForecastInput(BaseModel):
    student_id: str
    subject_id: str
    midterm_marks_pct: float
    attendance_pct: float
    assignment_submission_rate: float  # 0–1


@router.post("/grade-forecast")
async def forecast_grade(req: GradeForecastInput):
    """Simple linear regression-style estimate."""
    # Weights derived from domain heuristics (production: train on historical data)
    predicted = (req.midterm_marks_pct * 0.6) + (req.attendance_pct * 0.25) + (req.assignment_submission_rate * 100 * 0.15)
    predicted = round(min(max(predicted, 0), 100), 1)
    grade = "A+" if predicted >= 90 else "A" if predicted >= 80 else "B+" if predicted >= 70 else "B" if predicted >= 60 else "C" if predicted >= 50 else "D" if predicted >= 40 else "F"
    return {"predicted_final_pct": predicted, "predicted_grade": grade, "confidence": "medium"}


# ─── Fee Defaulter Prediction ─────────────────────────────────────────────────

@router.post("/fee-defaulter")
async def predict_defaulters(req: DropoutInput, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT s.id, s.full_name, s.roll_no, cl.name AS class_name,
            COALESCE(SUM(CASE WHEN fi.status IN ('UNPAID','PARTIAL') AND fi.due_date < NOW() THEN 1 ELSE 0 END), 0) AS overdue_count,
            COALESCE(SUM(fi.total_amt_rs - COALESCE(fi.paid_amt_rs, 0)), 0) AS outstanding_rs,
            COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - fi.due_date)) / 86400), 0) AS max_overdue_days
        FROM students s
        JOIN classes cl ON cl.id = s.class_id
        LEFT JOIN fee_invoices fi ON fi.student_id = s.id
        JOIN academic_sessions acs ON acs.id = s.academic_session_id AND acs.school_id = :school_id
        GROUP BY s.id, s.full_name, s.roll_no, cl.name
        HAVING SUM(CASE WHEN fi.status IN ('UNPAID','PARTIAL') AND fi.due_date < NOW() THEN 1 ELSE 0 END) > 0
        ORDER BY outstanding_rs DESC
    """), {"school_id": req.school_id})

    return [
        {
            "student_id": r["id"], "name": r["full_name"], "roll_no": r["roll_no"],
            "class_name": r["class_name"], "overdue_invoices": r["overdue_count"],
            "outstanding_rs": float(r["outstanding_rs"]), "max_overdue_days": float(r["max_overdue_days"]),
            "risk_level": "CRITICAL" if float(r["outstanding_rs"]) > 10000 or float(r["max_overdue_days"]) > 60 else "HIGH" if float(r["outstanding_rs"]) > 5000 else "MEDIUM",
        }
        for r in rows.mappings()
    ]


# ─── Teacher Effectiveness ────────────────────────────────────────────────────

@router.get("/teacher-effectiveness/{school_id}")
async def teacher_effectiveness(school_id: str, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT
            st.id, st.full_name, st.employee_code, st.department,
            COUNT(DISTINCT er.class_id) AS classes_taught,
            ROUND(AVG(er.percentage)::NUMERIC, 1) AS avg_student_score,
            COALESCE(AVG(
              100.0 * SUM(CASE WHEN ar.status='PRESENT' THEN 1 ELSE 0 END) OVER (PARTITION BY ar.class_id)
              / NULLIF(COUNT(ar.id) OVER (PARTITION BY ar.class_id), 0)
            ), 0) AS avg_class_attendance_pct
        FROM staff st
        JOIN exam_results er ON er.teacher_id = st.id
        LEFT JOIN attendance_records ar ON ar.class_id = er.class_id
        WHERE st.school_id = :school_id
        GROUP BY st.id, st.full_name, st.employee_code, st.department
        ORDER BY avg_student_score DESC
    """), {"school_id": school_id})

    results = []
    for r in rows.mappings():
        score = round(float(r["avg_student_score"] or 0) * 0.7 + float(r["avg_class_attendance_pct"] or 0) * 0.3, 1)
        results.append({
            "staff_id": r["id"], "name": r["full_name"], "emp_code": r["employee_code"],
            "department": r["department"], "classes_taught": r["classes_taught"],
            "avg_student_score": float(r["avg_student_score"] or 0),
            "effectiveness_score": score,
            "effectiveness_level": "EXCELLENT" if score >= 80 else "GOOD" if score >= 65 else "AVERAGE" if score >= 50 else "NEEDS_SUPPORT",
        })
    return results


# ─── Enrolment Forecast ───────────────────────────────────────────────────────

@router.get("/enrolment-forecast/{school_id}")
async def enrolment_forecast(school_id: str, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT
            EXTRACT(YEAR FROM a.created_at) AS yr,
            COUNT(*) AS enquiries,
            SUM(CASE WHEN a.status = 'ENROLLED' THEN 1 ELSE 0 END) AS enrolled
        FROM applications a
        WHERE a.school_id = :school_id
        GROUP BY yr ORDER BY yr
    """), {"school_id": school_id})

    data = [{"year": int(r["yr"]), "enquiries": r["enquiries"], "enrolled": r["enrolled"],
              "conversion_rate": round(r["enrolled"] / r["enquiries"] * 100, 1) if r["enquiries"] > 0 else 0}
            for r in rows.mappings()]

    if len(data) >= 2:
        # Simple linear projection for next year
        last_2 = data[-2:]
        growth = (last_2[-1]["enrolled"] - last_2[-2]["enrolled"]) / max(last_2[-2]["enrolled"], 1)
        projected = round(last_2[-1]["enrolled"] * (1 + growth))
        data.append({"year": int(data[-1]["year"]) + 1, "enquiries": None, "enrolled": None,
                     "conversion_rate": None, "projected_enrolled": projected, "is_forecast": True})
    return data


# ─── Financial Forecast ───────────────────────────────────────────────────────

@router.get("/financial-forecast/{school_id}")
async def financial_forecast(school_id: str, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT
            DATE_TRUNC('month', fp.paid_at) AS month,
            SUM(fp.amount_rs) AS fee_collected
        FROM fee_payments fp
        JOIN fee_invoices fi ON fi.id = fp.invoice_id
        WHERE fi.school_id = :school_id AND fp.paid_at >= NOW() - INTERVAL '12 months'
        GROUP BY month ORDER BY month
    """), {"school_id": school_id})

    monthly = [{"month": str(r["month"])[:7], "fee_collected_rs": float(r["fee_collected"])} for r in rows.mappings()]

    if monthly:
        avg = np.mean([m["fee_collected_rs"] for m in monthly])
        trend = np.polyfit(range(len(monthly)), [m["fee_collected_rs"] for m in monthly], 1)[0]
        from datetime import date
        import calendar
        current = date.today()
        forecasts = []
        for i in range(1, 4):
            m = (current.month + i - 1) % 12 + 1
            y = current.year + (current.month + i - 1) // 12
            projected = max(0, avg + trend * (len(monthly) + i))
            forecasts.append({"month": f"{y}-{m:02d}", "projected_fee_rs": round(projected), "scenario": "base"})
            forecasts.append({"month": f"{y}-{m:02d}", "projected_fee_rs": round(projected * 0.85), "scenario": "worst"})
            forecasts.append({"month": f"{y}-{m:02d}", "projected_fee_rs": round(projected * 1.15), "scenario": "best"})

        return {"historical": monthly, "forecast": forecasts}
    return {"historical": [], "forecast": []}


# ─── Parent Engagement Score ──────────────────────────────────────────────────

@router.get("/parent-engagement/{school_id}")
async def parent_engagement(school_id: str, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT
            s.id AS student_id, s.full_name, cl.name AS class_name,
            COUNT(DISTINCT al.id) FILTER (WHERE al.action = 'LOGIN' AND al.created_at > NOW() - INTERVAL '30 days') AS logins_30d,
            COALESCE(SUM(CASE WHEN fi.status = 'PAID' AND fi.paid_at <= fi.due_date THEN 1 ELSE 0 END), 0) AS on_time_payments,
            COALESCE(COUNT(fi.id), 0) AS total_invoices
        FROM students s
        JOIN classes cl ON cl.id = s.class_id
        LEFT JOIN student_parents sp ON sp.student_id = s.id
        LEFT JOIN audit_logs al ON al.user_id = sp.parent_id
        LEFT JOIN fee_invoices fi ON fi.student_id = s.id
        JOIN academic_sessions acs ON acs.id = s.academic_session_id AND acs.school_id = :school_id
        GROUP BY s.id, s.full_name, cl.name
    """), {"school_id": school_id})

    results = []
    for r in rows.mappings():
        login_score = min(int(r["logins_30d"]), 10) / 10 * 40
        payment_score = (int(r["on_time_payments"]) / max(int(r["total_invoices"]), 1)) * 60
        engagement = round(login_score + payment_score, 1)
        results.append({
            "student_id": r["student_id"], "student_name": r["full_name"], "class_name": r["class_name"],
            "engagement_score": engagement, "logins_30d": r["logins_30d"],
            "on_time_payment_rate": round(int(r["on_time_payments"]) / max(int(r["total_invoices"]), 1) * 100, 1),
            "level": "HIGH" if engagement >= 70 else "MEDIUM" if engagement >= 40 else "LOW",
        })
    results.sort(key=lambda x: x["engagement_score"], reverse=True)
    return results


# ─── Teacher Workload ─────────────────────────────────────────────────────────

@router.get("/teacher-workload/{school_id}")
async def teacher_workload(school_id: str, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT
            st.id, st.full_name, st.employee_code,
            COUNT(DISTINCT tt.id) AS weekly_periods,
            COUNT(DISTINCT s.id) AS student_count,
            COUNT(DISTINCT a.id) FILTER (WHERE a.due_date > NOW()) AS pending_assignments_to_grade
        FROM staff st
        LEFT JOIN timetable_slots tt ON tt.teacher_id = st.id
        LEFT JOIN class_enrollments ce ON ce.class_id = tt.class_id
        LEFT JOIN students s ON s.id = ce.student_id
        LEFT JOIN assignments a ON a.teacher_id = st.id AND a.due_date > NOW()
        WHERE st.school_id = :school_id
        GROUP BY st.id, st.full_name, st.employee_code
    """), {"school_id": school_id})

    results = []
    for r in rows.mappings():
        periods = int(r["weekly_periods"] or 0)
        students = int(r["student_count"] or 0)
        assignments = int(r["pending_assignments_to_grade"] or 0)
        workload = round((periods / 35 * 40) + (students / 150 * 30) + (assignments / 10 * 30), 1)
        results.append({
            "staff_id": r["id"], "name": r["full_name"], "emp_code": r["employee_code"],
            "weekly_periods": periods, "student_count": students, "pending_assignments": assignments,
            "workload_score": min(workload, 100),
            "overloaded": workload > 80,
        })
    results.sort(key=lambda x: x["workload_score"], reverse=True)
    return results
