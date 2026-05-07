"""Tests for /analytics/* endpoints."""
import pytest
from unittest.mock import MagicMock


def _row(**kwargs):
    """Build a MagicMock that behaves like a SQLAlchemy Row mapping."""
    m = MagicMock()
    m.__getitem__ = lambda self, key: kwargs.get(key)
    m.get = lambda key, default=None: kwargs.get(key, default)
    return m


class TestSchoolOverview:
    def test_returns_zeros_when_no_data(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/analytics/school/s1/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_students"] == 0
        assert data["fee_collection_rate_pct"] == 0.0

    def test_returns_overview_fields(self, client, mock_db):
        mock_db._rows = [_row(
            total_students=500, active_students=480, total_staff=40,
            total_classes=20, avg_attendance_pct=88.5,
            fee_collection_rate_pct=92.3, avg_exam_score_pct=74.1,
            dropout_rate_pct=1.2,
        )]
        resp = client.get("/analytics/school/s1/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_students"] == 500
        assert data["avg_attendance_pct"] == 88.5


class TestAttendanceHeatmap:
    def test_returns_list(self, client, mock_db):
        mock_db._rows = [
            _row(date="2026-05-01", class_name="Grade 5A", attendance_pct=92.0),
            _row(date="2026-05-01", class_name="Grade 5B", attendance_pct=88.0),
        ]
        resp = client.get("/analytics/school/s1/attendance?days=7")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_pagination_skip_limit(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/analytics/school/s1/attendance?skip=0&limit=10")
        assert resp.status_code == 200

    def test_limit_capped_at_500(self, client, mock_db):
        mock_db._rows = []
        # Should not raise — 1000 is silently capped to 500
        resp = client.get("/analytics/school/s1/attendance?limit=1000")
        assert resp.status_code == 200


class TestFinanceTrend:
    def test_calculates_collection_rate(self, client, mock_db):
        mock_db._rows = [
            _row(month="2026-04", billed_rs=1_000_000, collected_rs=900_000, outstanding_rs=100_000),
        ]
        resp = client.get("/analytics/school/s1/finance?months=1")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["collection_rate_pct"] == 90.0

    def test_zero_billed_gives_zero_rate(self, client, mock_db):
        mock_db._rows = [
            _row(month="2026-04", billed_rs=0, collected_rs=0, outstanding_rs=0),
        ]
        resp = client.get("/analytics/school/s1/finance?months=1")
        data = resp.json()
        assert data[0]["collection_rate_pct"] == 0


class TestSubjectPerformance:
    def test_returns_list(self, client, mock_db):
        mock_db._rows = [
            _row(subject_name="Maths", avg_score_pct=72.5, pass_rate_pct=88.0,
                 top_score_pct=99.0, lowest_score_pct=40.0, student_count=120),
        ]
        resp = client.get("/analytics/school/s1/academics")
        assert resp.status_code == 200
        assert resp.json()[0]["subject_name"] == "Maths"

    def test_pagination_params(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/analytics/school/s1/academics?skip=10&limit=5")
        assert resp.status_code == 200
