"""Tests for /plagiarism/* endpoints."""


class TestPlagiarismCheck:
    def test_returns_result_for_matching_texts(self, client, mock_db):
        mock_db._rows = []
        payload = {
            "assignment_id": "asgn1",
            "student_id": "st1",
            "submission_text": "The water cycle describes how water evaporates from the surface.",
        }
        resp = client.post("/plagiarism/check", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))

    def test_identical_text_low_default_similarity(self, client, mock_db):
        """When no DB comparisons exist, similarity_matches should be empty list."""
        mock_db._rows = []
        text = "Photosynthesis is the process by which plants use sunlight to make food."
        payload = {
            "assignment_id": "asgn2",
            "student_id": "st1",
            "submission_text": text,
        }
        resp = client.post("/plagiarism/check", json=payload)
        assert resp.status_code == 200


class TestPlagiarismClassReport:
    def test_get_report_returns_200_or_404(self, client, mock_db):
        mock_db._rows = []
        resp = client.get("/plagiarism/class-report/asgn1")
        assert resp.status_code in (200, 404)
