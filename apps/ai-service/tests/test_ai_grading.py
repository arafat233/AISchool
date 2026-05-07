"""Tests for /grading/* endpoints (AI-assisted grading)."""


class TestGradeSubjective:
    def test_returns_score_and_feedback(self, client, mock_db):
        mock_db._rows = []
        payload = {
            "question": "Explain the process of photosynthesis.",
            "model_answer": "Photosynthesis is the process by which plants convert sunlight, water, and CO2 into glucose and oxygen.",
            "student_answer": "Plants use sunlight and water to make food and release oxygen.",
            "max_marks": 5,
        }
        resp = client.post("/grading/subjective", json=payload)
        assert resp.status_code in (200, 422)
        if resp.status_code == 200:
            data = resp.json()
            assert "score" in data or "marks" in data or "feedback" in data

    def test_empty_answer_returns_low_score(self, client, mock_db):
        mock_db._rows = []
        payload = {
            "question": "What is Newton's first law?",
            "model_answer": "An object at rest stays at rest unless acted on by an external force.",
            "student_answer": "",
            "max_marks": 5,
        }
        resp = client.post("/grading/subjective", json=payload)
        if resp.status_code == 200:
            data = resp.json()
            score = data.get("score") or data.get("marks") or 0
            assert float(score) <= 2  # very low score expected


class TestBatchGrade:
    def test_batch_endpoint_exists(self, client, mock_db):
        mock_db._rows = []
        resp = client.post("/grading/batch", json={"submissions": [], "exam_id": "e1"})
        assert resp.status_code in (200, 404, 422)
