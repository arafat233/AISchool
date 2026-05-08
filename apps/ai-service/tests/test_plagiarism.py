"""Tests for /plagiarism/* endpoints."""


class TestPlagiarismDetect:
    def test_returns_result_for_matching_texts(self, client, mock_db):
        mock_db._rows = []
        payload = {
            "submission_id": "sub1",
            "student_id": "st1",
            "text": "The water cycle describes how water evaporates from the surface.",
            "compare_against": [
                {"id": "ref1", "text": "The water cycle explains how water evaporates from surfaces."},
            ],
        }
        resp = client.post("/plagiarism/detect", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "similarity_score" in data or "results" in data or isinstance(data, list)

    def test_identical_text_gets_high_score(self, client, mock_db):
        mock_db._rows = []
        text = "Photosynthesis is the process by which plants use sunlight to make food."
        payload = {
            "submission_id": "sub2",
            "student_id": "st1",
            "text": text,
            "compare_against": [{"id": "ref1", "text": text}],
        }
        resp = client.post("/plagiarism/detect", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        # Score for identical text should be near 1.0 (or 100%)
        score = data.get("similarity_score") or (data[0].get("similarity") if isinstance(data, list) else None)
        assert score is not None
        assert float(score) >= 0.9


class TestPlagiarismReport:
    def test_get_report_returns_200_or_404(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/plagiarism/report/sub1")
        assert resp.status_code in (200, 404)
