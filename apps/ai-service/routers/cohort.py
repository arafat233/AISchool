"""
Cohort Analysis — track a batch from Grade 1 → Grade 12.
Metrics: progression rate, dropout, average performance, fee consistency.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from services.db import get_db

router = APIRouter()


class CohortStats(BaseModel):
    cohort_year: int       # year the batch was admitted (Grade 1)
    grade: str
    enrolled: int
    active: int
    dropped_out: int
    progression_rate_pct: float
    avg_exam_score_pct: float
    fee_collection_rate_pct: float


@router.get("/{school_id}", response_model=list[CohortStats])
async def cohort_analysis(school_id: str, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT
            s.admission_year AS cohort_year,
            cl.name AS grade,
            COUNT(s.id) AS enrolled,
            COUNT(s.id) FILTER (WHERE s.status = 'ACTIVE') AS active,
            COUNT(s.id) FILTER (WHERE s.status = 'LEFT') AS dropped_out,
            ROUND(AVG(er.percentage)::NUMERIC, 1) AS avg_exam_score,
            ROUND(
                100.0 * COUNT(DISTINCT fp.id) FILTER (WHERE fi.status = 'PAID')
                / NULLIF(COUNT(DISTINCT fi.id), 0)
            , 1) AS fee_collection_rate
        FROM students s
        JOIN classes cl ON cl.id = s.class_id
        LEFT JOIN exam_results er ON er.student_id = s.id
        LEFT JOIN fee_invoices fi ON fi.student_id = s.id
        LEFT JOIN fee_payments fp ON fp.invoice_id = fi.id
        WHERE s.school_id = :school_id
        GROUP BY s.admission_year, cl.name
        ORDER BY s.admission_year ASC, cl.name
    """), {"school_id": school_id})

    result = []
    for r in rows.mappings():
        enrolled = int(r["enrolled"] or 0)
        active = int(r["active"] or 0)
        dropped = int(r["dropped_out"] or 0)
        progression = round(active / enrolled * 100, 1) if enrolled > 0 else 0
        result.append(CohortStats(
            cohort_year=int(r["cohort_year"] or 0),
            grade=r["grade"] or "Unknown",
            enrolled=enrolled,
            active=active,
            dropped_out=dropped,
            progression_rate_pct=progression,
            avg_exam_score_pct=float(r["avg_exam_score"] or 0),
            fee_collection_rate_pct=float(r["fee_collection_rate"] or 0),
        ))
    return result


@router.get("/{school_id}/dropout-journey")
async def dropout_journey(school_id: str, db: AsyncSession = Depends(get_db)):
    """How many students drop out at each grade transition."""
    rows = await db.execute(text("""
        SELECT
            s.admission_year,
            cl.grade_level,
            COUNT(*) FILTER (WHERE s.status = 'LEFT') AS dropped,
            COUNT(*) AS total
        FROM students s
        JOIN classes cl ON cl.id = s.class_id
        WHERE s.school_id = :school_id
        GROUP BY s.admission_year, cl.grade_level
        ORDER BY s.admission_year, cl.grade_level
    """), {"school_id": school_id})

    return [
        {
            "cohort_year": r["admission_year"],
            "grade_level": r["grade_level"],
            "total": r["total"],
            "dropped": r["dropped"],
            "dropout_rate_pct": round(r["dropped"] / r["total"] * 100, 1) if r["total"] > 0 else 0,
        }
        for r in rows.mappings()
    ]
