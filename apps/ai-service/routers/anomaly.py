"""
Anomaly Detection using Z-score + rolling baselines.
Detects:
  - Sudden attendance drop per class
  - Unexpected fee spike
  - High nurse visit frequency (health-service)
  - Any configurable metric outside N standard deviations
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import numpy as np
from services.db import get_db

router = APIRouter()


class AnomalyAlert(BaseModel):
    type: str
    school_id: str
    entity: str            # class name / student ID / fee type
    metric: str
    current_value: float
    baseline_mean: float
    baseline_std: float
    z_score: float
    severity: str          # LOW / MEDIUM / HIGH / CRITICAL
    message: str


@router.get("/detect/{school_id}", response_model=list[AnomalyAlert])
async def detect_anomalies(school_id: str, db: AsyncSession = Depends(get_db)):
    alerts: list[AnomalyAlert] = []

    # ── 1. Attendance drop per class (last 7 days vs 30-day baseline) ──────────
    att_rows = await db.execute(text("""
        WITH daily AS (
            SELECT
                cl.name AS class_name,
                ar.date,
                ROUND(100.0 * SUM(CASE WHEN ar.status='PRESENT' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) AS pct
            FROM attendance_records ar
            JOIN students s ON s.id = ar.student_id
            JOIN classes cl ON cl.id = s.class_id
            WHERE ar.school_id = :school_id AND ar.date >= NOW() - INTERVAL '37 days'
            GROUP BY cl.name, ar.date
        )
        SELECT
            class_name,
            AVG(pct) FILTER (WHERE date < NOW() - INTERVAL '7 days') AS baseline_avg,
            STDDEV(pct) FILTER (WHERE date < NOW() - INTERVAL '7 days') AS baseline_std,
            AVG(pct) FILTER (WHERE date >= NOW() - INTERVAL '7 days') AS recent_avg
        FROM daily
        GROUP BY class_name
        HAVING COUNT(date) >= 7
    """), {"school_id": school_id})

    for r in att_rows.mappings():
        baseline = float(r["baseline_avg"] or 75)
        std = float(r["baseline_std"] or 5)
        recent = float(r["recent_avg"] or baseline)
        z = (recent - baseline) / max(std, 1)
        if z < -1.5:
            alerts.append(AnomalyAlert(
                type="ATTENDANCE_DROP", school_id=school_id, entity=r["class_name"],
                metric="attendance_pct", current_value=round(recent, 1), baseline_mean=round(baseline, 1),
                baseline_std=round(std, 1), z_score=round(z, 2),
                severity="CRITICAL" if z < -3 else "HIGH" if z < -2 else "MEDIUM",
                message=f"Class {r['class_name']} attendance dropped from {baseline:.0f}% to {recent:.0f}% in the last 7 days.",
            ))

    # ── 2. Fee collection spike ────────────────────────────────────────────────
    fee_rows = await db.execute(text("""
        WITH monthly AS (
            SELECT
                DATE_TRUNC('month', fp.paid_at) AS month,
                SUM(fp.amount_rs) AS total
            FROM fee_payments fp
            JOIN fee_invoices fi ON fi.id = fp.invoice_id
            WHERE fi.school_id = :school_id AND fp.paid_at >= NOW() - INTERVAL '13 months'
            GROUP BY month
        )
        SELECT
            AVG(total) FILTER (WHERE month < DATE_TRUNC('month', NOW())) AS baseline_avg,
            STDDEV(total) FILTER (WHERE month < DATE_TRUNC('month', NOW())) AS baseline_std,
            MAX(total) FILTER (WHERE month = DATE_TRUNC('month', NOW())) AS current_month
        FROM monthly
    """), {"school_id": school_id})

    for r in fee_rows.mappings():
        if r["baseline_avg"] and r["current_month"]:
            baseline = float(r["baseline_avg"])
            std = float(r["baseline_std"] or baseline * 0.1)
            current = float(r["current_month"])
            z = (current - baseline) / max(std, 1)
            if abs(z) > 2:
                alerts.append(AnomalyAlert(
                    type="FEE_SPIKE", school_id=school_id, entity="FeeCollection",
                    metric="monthly_collection_rs", current_value=current, baseline_mean=baseline,
                    baseline_std=std, z_score=round(z, 2),
                    severity="HIGH" if abs(z) > 3 else "MEDIUM",
                    message=f"Fee collection this month (₹{current:,.0f}) is unusual vs baseline (₹{baseline:,.0f}).",
                ))

    # ── 3. High nurse visit frequency ─────────────────────────────────────────
    nurse_rows = await db.execute(text("""
        WITH daily AS (
            SELECT DATE(created_at) AS d, COUNT(*) AS visits
            FROM health_visits
            WHERE school_id = :school_id AND created_at >= NOW() - INTERVAL '37 days'
            GROUP BY d
        )
        SELECT
            AVG(visits) FILTER (WHERE d < NOW()::DATE - 7) AS baseline_avg,
            STDDEV(visits) FILTER (WHERE d < NOW()::DATE - 7) AS baseline_std,
            AVG(visits) FILTER (WHERE d >= NOW()::DATE - 7) AS recent_avg
        FROM daily
    """), {"school_id": school_id})

    for r in nurse_rows.mappings():
        if r["baseline_avg"] and r["recent_avg"]:
            baseline = float(r["baseline_avg"])
            std = float(r["baseline_std"] or 2)
            recent = float(r["recent_avg"])
            z = (recent - baseline) / max(std, 1)
            if z > 2:
                alerts.append(AnomalyAlert(
                    type="HEALTH_SPIKE", school_id=school_id, entity="HealthClinic",
                    metric="daily_visits", current_value=round(recent, 1), baseline_mean=round(baseline, 1),
                    baseline_std=round(std, 1), z_score=round(z, 2),
                    severity="HIGH" if z > 3 else "MEDIUM",
                    message=f"Clinic visits spiked to {recent:.0f}/day vs baseline {baseline:.0f}/day — possible outbreak.",
                ))

    return sorted(alerts, key=lambda a: abs(a.z_score), reverse=True)
