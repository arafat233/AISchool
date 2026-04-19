"""
Advanced Analytics — school-level and district-level dashboards.
Endpoints:
  - GET /analytics/school/{school_id}/overview    — KPI snapshot
  - GET /analytics/school/{school_id}/attendance  — attendance heatmap data
  - GET /analytics/school/{school_id}/finance     — revenue / collection trend
  - GET /analytics/school/{school_id}/academics   — subject performance breakdown
  - GET /analytics/class/{class_id}/performance   — per-class deep dive
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from services.db import get_db

router = APIRouter()


# ── Response models ──────────────────────────────────────────────────────────

class SchoolOverview(BaseModel):
    total_students: int
    active_students: int
    total_staff: int
    total_classes: int
    avg_attendance_pct: float
    fee_collection_rate_pct: float
    avg_exam_score_pct: float
    dropout_rate_pct: float


class AttendanceHeatmapEntry(BaseModel):
    date: str
    class_name: str
    attendance_pct: float


class FinanceTrend(BaseModel):
    month: str
    billed_rs: float
    collected_rs: float
    collection_rate_pct: float
    outstanding_rs: float


class SubjectPerformance(BaseModel):
    subject_name: str
    avg_score_pct: float
    pass_rate_pct: float
    top_score_pct: float
    lowest_score_pct: float
    student_count: int


class ClassPerformanceDetail(BaseModel):
    class_id: str
    class_name: str
    total_students: int
    avg_attendance_pct: float
    avg_exam_score_pct: float
    pass_rate_pct: float
    top_performer: str
    bottom_performer: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/school/{school_id}/overview", response_model=SchoolOverview)
async def school_overview(school_id: str, db: AsyncSession = Depends(get_db)):
    """High-level KPI snapshot for a school."""
    row = await db.execute(text("""
        SELECT
            COUNT(s.id)                                                          AS total_students,
            COUNT(s.id) FILTER (WHERE s.status = 'ACTIVE')                      AS active_students,
            (SELECT COUNT(*) FROM staff WHERE school_id = :school_id)            AS total_staff,
            (SELECT COUNT(*) FROM classes WHERE school_id = :school_id)          AS total_classes,
            ROUND(
                100.0 * SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(ar.id), 0)
            , 1)                                                                 AS avg_attendance_pct,
            ROUND(
                100.0 * COUNT(DISTINCT fp.id) FILTER (WHERE fi.status = 'PAID')
                / NULLIF(COUNT(DISTINCT fi.id), 0)
            , 1)                                                                 AS fee_collection_rate_pct,
            ROUND(AVG(er.percentage)::NUMERIC, 1)                               AS avg_exam_score_pct,
            ROUND(
                100.0 * COUNT(s.id) FILTER (WHERE s.status = 'LEFT')
                / NULLIF(COUNT(s.id), 0)
            , 1)                                                                 AS dropout_rate_pct
        FROM students s
        LEFT JOIN attendance_records ar ON ar.student_id = s.id
        LEFT JOIN fee_invoices fi ON fi.student_id = s.id
        LEFT JOIN fee_payments fp ON fp.invoice_id = fi.id
        LEFT JOIN exam_results er ON er.student_id = s.id
        WHERE s.school_id = :school_id
    """), {"school_id": school_id})

    r = row.mappings().fetchone()
    if not r:
        return SchoolOverview(
            total_students=0, active_students=0, total_staff=0, total_classes=0,
            avg_attendance_pct=0, fee_collection_rate_pct=0, avg_exam_score_pct=0, dropout_rate_pct=0,
        )
    return SchoolOverview(
        total_students=int(r["total_students"] or 0),
        active_students=int(r["active_students"] or 0),
        total_staff=int(r["total_staff"] or 0),
        total_classes=int(r["total_classes"] or 0),
        avg_attendance_pct=float(r["avg_attendance_pct"] or 0),
        fee_collection_rate_pct=float(r["fee_collection_rate_pct"] or 0),
        avg_exam_score_pct=float(r["avg_exam_score_pct"] or 0),
        dropout_rate_pct=float(r["dropout_rate_pct"] or 0),
    )


@router.get("/school/{school_id}/attendance", response_model=list[AttendanceHeatmapEntry])
async def attendance_heatmap(school_id: str, days: int = 30, db: AsyncSession = Depends(get_db)):
    """Daily attendance % per class for the last N days — used for heatmap charts."""
    rows = await db.execute(text("""
        SELECT
            ar.date::TEXT AS date,
            cl.name AS class_name,
            ROUND(
                100.0 * SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(*), 0)
            , 1) AS attendance_pct
        FROM attendance_records ar
        JOIN students s ON s.id = ar.student_id
        JOIN classes cl ON cl.id = s.class_id
        WHERE ar.school_id = :school_id
          AND ar.date >= NOW() - CAST(:days || ' days' AS INTERVAL)
        GROUP BY ar.date, cl.name
        ORDER BY ar.date DESC, cl.name
    """), {"school_id": school_id, "days": days})

    return [
        AttendanceHeatmapEntry(
            date=r["date"],
            class_name=r["class_name"],
            attendance_pct=float(r["attendance_pct"] or 0),
        )
        for r in rows.mappings()
    ]


@router.get("/school/{school_id}/finance", response_model=list[FinanceTrend])
async def finance_trend(school_id: str, months: int = 12, db: AsyncSession = Depends(get_db)):
    """Month-by-month fee billing vs collection — last N months."""
    rows = await db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', fi.due_date), 'YYYY-MM') AS month,
            SUM(fi.amount_rs)                                      AS billed_rs,
            COALESCE(SUM(fp.amount_rs), 0)                        AS collected_rs,
            SUM(fi.amount_rs) - COALESCE(SUM(fp.amount_rs), 0)   AS outstanding_rs
        FROM fee_invoices fi
        JOIN students s ON s.id = fi.student_id
        LEFT JOIN fee_payments fp ON fp.invoice_id = fi.id
        WHERE fi.school_id = :school_id
          AND fi.due_date >= DATE_TRUNC('month', NOW()) - CAST((:months - 1) || ' months' AS INTERVAL)
        GROUP BY DATE_TRUNC('month', fi.due_date)
        ORDER BY month ASC
    """), {"school_id": school_id, "months": months})

    result = []
    for r in rows.mappings():
        billed = float(r["billed_rs"] or 0)
        collected = float(r["collected_rs"] or 0)
        rate = round(collected / billed * 100, 1) if billed > 0 else 0
        result.append(FinanceTrend(
            month=r["month"],
            billed_rs=billed,
            collected_rs=collected,
            collection_rate_pct=rate,
            outstanding_rs=float(r["outstanding_rs"] or 0),
        ))
    return result


@router.get("/school/{school_id}/academics", response_model=list[SubjectPerformance])
async def subject_performance(school_id: str, db: AsyncSession = Depends(get_db)):
    """Per-subject performance breakdown — avg/pass rate/top/bottom scores."""
    rows = await db.execute(text("""
        SELECT
            sub.name AS subject_name,
            ROUND(AVG(er.percentage)::NUMERIC, 1)                                    AS avg_score_pct,
            ROUND(
                100.0 * COUNT(*) FILTER (WHERE er.percentage >= 33)
                / NULLIF(COUNT(*), 0)
            , 1)                                                                     AS pass_rate_pct,
            ROUND(MAX(er.percentage)::NUMERIC, 1)                                    AS top_score_pct,
            ROUND(MIN(er.percentage)::NUMERIC, 1)                                    AS lowest_score_pct,
            COUNT(er.student_id)                                                     AS student_count
        FROM exam_results er
        JOIN exams e ON e.id = er.exam_id
        JOIN subjects sub ON sub.id = e.subject_id
        JOIN students s ON s.id = er.student_id
        WHERE s.school_id = :school_id
        GROUP BY sub.name
        ORDER BY avg_score_pct DESC
    """), {"school_id": school_id})

    return [
        SubjectPerformance(
            subject_name=r["subject_name"],
            avg_score_pct=float(r["avg_score_pct"] or 0),
            pass_rate_pct=float(r["pass_rate_pct"] or 0),
            top_score_pct=float(r["top_score_pct"] or 0),
            lowest_score_pct=float(r["lowest_score_pct"] or 0),
            student_count=int(r["student_count"] or 0),
        )
        for r in rows.mappings()
    ]


@router.get("/class/{class_id}/performance", response_model=ClassPerformanceDetail)
async def class_performance(class_id: str, db: AsyncSession = Depends(get_db)):
    """Deep-dive metrics for a single class."""
    row = await db.execute(text("""
        SELECT
            cl.id AS class_id,
            cl.name AS class_name,
            COUNT(DISTINCT s.id) AS total_students,
            ROUND(
                100.0 * SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(ar.id), 0)
            , 1) AS avg_attendance_pct,
            ROUND(AVG(er.percentage)::NUMERIC, 1) AS avg_exam_score_pct,
            ROUND(
                100.0 * COUNT(DISTINCT er.student_id) FILTER (WHERE er.percentage >= 33)
                / NULLIF(COUNT(DISTINCT er.student_id), 0)
            , 1) AS pass_rate_pct
        FROM classes cl
        JOIN students s ON s.class_id = cl.id
        LEFT JOIN attendance_records ar ON ar.student_id = s.id
        LEFT JOIN exam_results er ON er.student_id = s.id
        WHERE cl.id = :class_id
        GROUP BY cl.id, cl.name
    """), {"class_id": class_id})

    r = row.mappings().fetchone()
    if not r:
        return ClassPerformanceDetail(
            class_id=class_id, class_name="Unknown", total_students=0,
            avg_attendance_pct=0, avg_exam_score_pct=0, pass_rate_pct=0,
            top_performer="N/A", bottom_performer="N/A",
        )

    # Top and bottom performers
    perf = await db.execute(text("""
        SELECT s.full_name, AVG(er.percentage) AS avg_pct
        FROM exam_results er
        JOIN students s ON s.id = er.student_id
        WHERE s.class_id = :class_id
        GROUP BY s.full_name
        ORDER BY avg_pct DESC
    """), {"class_id": class_id})
    performers = list(perf.mappings())
    top = performers[0]["full_name"] if performers else "N/A"
    bottom = performers[-1]["full_name"] if len(performers) > 1 else "N/A"

    return ClassPerformanceDetail(
        class_id=str(r["class_id"]),
        class_name=r["class_name"],
        total_students=int(r["total_students"] or 0),
        avg_attendance_pct=float(r["avg_attendance_pct"] or 0),
        avg_exam_score_pct=float(r["avg_exam_score_pct"] or 0),
        pass_rate_pct=float(r["pass_rate_pct"] or 0),
        top_performer=top,
        bottom_performer=bottom,
    )
