"""Tests for /cohort/* endpoints."""
from unittest.mock import MagicMock


def _row(**kwargs):
    m = MagicMock()
    m.__getitem__ = lambda self, key: kwargs.get(key)
    return m


class TestCohortAnalysis:
    def test_returns_empty_list_when_no_data(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/cohort/s1")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_cohort_stats_shape(self, client, mock_db):
        mock_db._rows = [_row(
            cohort_year=2015, grade="Grade 10",
            enrolled=120, active=108, dropped_out=12,
            progression_rate_pct=90.0,
            avg_exam_score_pct=74.5,
            fee_collection_rate_pct=88.0,
        )]
        resp = client.get("/cohort/s1")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        item = data[0]
        assert "cohort_year" in item
        assert "progression_rate_pct" in item
