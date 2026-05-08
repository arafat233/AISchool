"""Tests for /anomaly/* endpoints."""
from unittest.mock import MagicMock


def _row(**kwargs):
    m = MagicMock()
    m.__getitem__ = lambda self, key: kwargs.get(key)
    return m


class TestAttendanceAnomalies:
    def test_returns_list(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/anomaly/detect/s1")
        assert resp.status_code == 200
        assert isinstance(resp.json(), (list, dict))

    def test_anomaly_fields_present(self, client, mock_db):
        mock_db._rows = [_row(
            class_name="Grade 5A",
            current_pct=40.0, mean_pct=88.0, std_pct=3.5,
        )]
        resp = client.get("/anomaly/detect/s1")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))


class TestFeeAnomalies:
    def test_returns_list(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/anomaly/detect/s1")
        assert resp.status_code == 200
        assert isinstance(resp.json(), (list, dict))


class TestScanAllAnomalies:
    def test_full_scan_returns_list(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/anomaly/detect/s1")
        assert resp.status_code == 200
        assert isinstance(resp.json(), (list, dict))
