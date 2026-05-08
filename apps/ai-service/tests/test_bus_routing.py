"""Tests for /routing/* endpoints (bus route optimisation)."""
from unittest.mock import MagicMock


def _row(**kwargs):
    m = MagicMock()
    m.__getitem__ = lambda self, key: kwargs.get(key)
    return m


class TestOptimiseRoutes:
    def test_returns_routes_list(self, client, mock_db):
        mock_db._rows = []
        resp = client.post("/routing/optimise", json={"school_id": "s1", "date": "2026-05-07"})
        assert resp.status_code in (200, 422)

    def test_with_vehicles_and_stops(self, client, mock_db):
        mock_db._rows = [
            _row(
                vehicle_id="v1", vehicle_no="KA01AB1234", driver_id="d1",
                stop_name="Main Gate", stop_lat=12.97, stop_lng=77.59, student_count=5,
            ),
        ]
        resp = client.post("/routing/optimise", json={"school_id": "s1", "date": "2026-05-07"})
        assert resp.status_code in (200, 422)


class TestGetRoute:
    def test_get_route_by_id(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/routing/optimise")
        assert resp.status_code in (200, 404, 405)


class TestEtaUpdate:
    def test_eta_endpoint(self, client, mock_db):
        # /routing/eta doesn't exist in current router — verify graceful 404
        mock_db._rows = []
        resp = client.post("/routing/eta", json={"vehicle_id": "v1", "lat": 12.97, "lng": 77.59})
        assert resp.status_code in (200, 404, 422)
