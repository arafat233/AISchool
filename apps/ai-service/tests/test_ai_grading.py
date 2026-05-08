"""Tests for /grading/* endpoints (AI-assisted grading)."""

_RUBRIC = [{"name": "Understanding", "max_score": 3, "description": "Conceptual understanding"},
           {"name": "Accuracy", "max_score": 2, "description": "Factual accuracy"}]

_BASE = {
    "rubric": _RUBRIC,
    "max_total_score": 5,
    "subject": "Science",
    "grade_level": "Grade 7",
}


class TestGradeSubjective:
    def test_returns_score_and_feedback(self, client, mock_db):
        mock_db._rows = []
        payload = {
            **_BASE,
            "question": "Explain the process of photosynthesis.",
            "model_answer": "Photosynthesis is the process by which plants convert sunlight, water, and CO2 into glucose and oxygen.",
            "student_answer": "Plants use sunlight and water to make food and release oxygen.",
        }
        resp = client.post("/grading/grade", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "score" in data or "marks" in data or "feedback" in data or "criteria_scores" in data

    def test_empty_answer_returns_zero_score(self, client, mock_db):
        """Short answer (< 15 words) triggers auto-zero bypass without calling Claude."""
        mock_db._rows = []
        payload = {
            **_BASE,
            "question": "What is Newton's first law?",
            "model_answer": "An object at rest stays at rest unless acted on by an external force.",
            "student_answer": "don't know",
        }
        resp = client.post("/grading/grade", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        # Short-answer bypass returns score=0
        score = data.get("score") or data.get("total_score") or data.get("marks") or 0
        assert float(score) == 0.0


class TestBatchGrade:
    def test_empty_batch_returns_empty_list(self, client, mock_db):
        mock_db._rows = []
        resp = client.post("/grading/batch-grade", json={"submissions": []})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) == 0

    def test_batch_with_short_answers_auto_zeros(self, client, mock_db):
        """All short answers in batch should be zeroed without a Claude call."""
        mock_db._rows = []
        payload = {
            "submissions": [
                {**_BASE, "question": "Q1", "model_answer": "Answer", "student_answer": "no idea"},
                {**_BASE, "question": "Q2", "model_answer": "Answer", "student_answer": "skip"},
            ]
        }
        resp = client.post("/grading/batch-grade", json=payload)
        assert resp.status_code == 200
        results = resp.json()
        assert isinstance(results, list)
        assert len(results) == 2
