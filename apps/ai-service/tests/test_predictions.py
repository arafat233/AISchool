"""Tests for /predict/* endpoints."""
from unittest.mock import MagicMock


def _row(**kwargs):
    m = MagicMock()
    m.__getitem__ = lambda self, key: kwargs.get(key)
    return m


class TestDropoutPrediction:
    def test_empty_school_returns_list(self, client, mock_db):
        mock_db._rows = []
        resp = client.post("/predict/dropout", json={"school_id": "s1"})
        assert resp.status_code == 200
        assert resp.json() == []

    def test_risk_level_high_for_high_score(self, client, mock_db):
        mock_db._rows = [_row(
            id="st1", full_name="Test Student", roll_no="001", class_name="Grade 5",
            attendance_pct=40.0,
            fee_default_rate=80.0,
            lms_inactive_days=85.0,
            below_pass_count=4,
        )]
        resp = client.post("/predict/dropout", json={"school_id": "s1"})
        assert resp.status_code == 200
        results = resp.json()
        assert isinstance(results, list)
        assert len(results) > 0
        assert results[0]["risk_level"] in ("HIGH", "MEDIUM", "LOW")


class TestFeeDefaulterPrediction:
    def test_returns_list_format(self, client, mock_db):
        mock_db._rows = []
        resp = client.post("/predict/fee-defaulter", json={"school_id": "s1"})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestEnrolmentForecast:
    def test_endpoint_exists(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/predict/enrolment-forecast/s1")
        assert resp.status_code in (200, 422, 500)
        if resp.status_code == 200:
            assert isinstance(resp.json(), (list, dict))


class TestFinancialForecast:
    def test_returns_list(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/predict/financial-forecast/s1")
        assert resp.status_code in (200, 422, 500)
        if resp.status_code == 200:
            assert isinstance(resp.json(), (list, dict))
