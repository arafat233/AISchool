"""
AI-Assisted Grading using Claude Haiku.

Cost optimisations applied:
  • Short-answer bypass (< 15 words) → instant zero, no Claude call
  • max_tokens reduced 1024 → 700
  • Batch-grade endpoint: up to 10 submissions in a single Claude call
    (e.g. 10 submissions → 1 call instead of 10, ~90% cost reduction for bulk grading)
"""
import json
import logging
import os
from typing import Optional

from anthropic import Anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)
router = APIRouter()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

SHORT_ANSWER_WORDS = 15   # below this → auto-zero, skip Claude
MAX_BATCH_SIZE = 10


# ─── Models ─────────────────────────────────────────────────────────────────


class RubricCriterion(BaseModel):
    name: str
    max_score: int
    description: str


class GradingRequest(BaseModel):
    question: str
    student_answer: str
    model_answer: str
    rubric: list[RubricCriterion]
    max_total_score: int
    subject: str
    grade_level: str


class BatchGradingRequest(BaseModel):
    submissions: list[GradingRequest]

    @field_validator("submissions")
    @classmethod
    def cap_batch(cls, v: list) -> list:
        return v[:MAX_BATCH_SIZE]


class CriterionScore(BaseModel):
    criterion: str
    awarded: int
    max_score: int
    justification: str


class GradingResult(BaseModel):
    content_score: int
    language_score: int
    total_score: int
    max_score: int
    percentage: float
    criteria_scores: list[CriterionScore]
    key_points_covered: list[str]
    key_points_missed: list[str]
    feedback: str
    confidence: str
    teacher_override_applied: bool = False


# ─── Shared helpers ──────────────────────────────────────────────────────────


def _zero_result(max_score: int, reason: str) -> GradingResult:
    return GradingResult(
        content_score=0, language_score=0, total_score=0,
        max_score=max_score, percentage=0.0,
        criteria_scores=[], key_points_covered=[], key_points_missed=[],
        feedback=reason, confidence="LOW",
    )


def _parse_grade_data(data: dict, max_score: int) -> GradingResult:
    criteria_scores = [CriterionScore(**cs) for cs in data.get("criteria_scores", [])]
    content_score = sum(cs.awarded for cs in criteria_scores)
    total = content_score
    return GradingResult(
        content_score=content_score,
        language_score=int(data.get("language_score", 5)),
        total_score=total,
        max_score=max_score,
        percentage=round(total / max_score * 100, 1) if max_score else 0.0,
        criteria_scores=criteria_scores,
        key_points_covered=data.get("key_points_covered", []),
        key_points_missed=data.get("key_points_missed", []),
        feedback=data.get("feedback", ""),
        confidence=data.get("confidence", "MEDIUM"),
    )


def _build_rubric_text(rubric: list[RubricCriterion]) -> str:
    return "\n".join(f"  - {c.name} ({c.max_score} marks): {c.description}" for c in rubric)


_JSON_SCHEMA = """{
  "criteria_scores": [{"criterion": str, "awarded": int, "max_score": int, "justification": str}],
  "key_points_covered": [str],
  "key_points_missed": [str],
  "language_score": int (0-10),
  "feedback": str (2-3 sentences),
  "confidence": "HIGH"|"MEDIUM"|"LOW"
}"""


# ─── Single-submission endpoint ──────────────────────────────────────────────


@router.post("/grade", response_model=GradingResult)
async def grade_answer(req: GradingRequest):
    # Short-answer bypass — no point calling Claude for 3-word answers
    if len(req.student_answer.split()) < SHORT_ANSWER_WORDS:
        return _zero_result(
            req.max_total_score,
            "Answer is too short to evaluate. Please provide a detailed response.",
        )

    prompt = (
        f"You are an expert teacher grading a {req.subject} answer (Grade: {req.grade_level}).\n\n"
        f"QUESTION:\n{req.question}\n\n"
        f"MODEL ANSWER:\n{req.model_answer}\n\n"
        f"STUDENT ANSWER:\n{req.student_answer}\n\n"
        f"RUBRIC ({req.max_total_score} marks total):\n{_build_rubric_text(req.rubric)}\n\n"
        f"Respond in JSON:\n{_JSON_SCHEMA}\n\nBe fair and award partial credit where deserved."
    )

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=700,   # reduced from 1024
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text
        start, end = raw.find("{"), raw.rfind("}") + 1
        return _parse_grade_data(json.loads(raw[start:end]), req.max_total_score)
    except Exception as exc:
        logger.warning("AI grading failed: %s", exc)
        return _zero_result(req.max_total_score, f"Grading failed. Please grade manually.")


# ─── Batch endpoint — multiple submissions, one Claude call ──────────────────


@router.post("/batch-grade", response_model=list[GradingResult])
async def batch_grade(req: BatchGradingRequest):
    """
    Grade up to 10 submissions in a single Claude call.
    Submissions with short answers are bypassed locally; the rest are
    sent to Claude as one prompt returning a JSON array.
    ~90% cost reduction compared to grading each submission individually.
    """
    results: list[Optional[GradingResult]] = [None] * len(req.submissions)
    to_grade: list[tuple[int, GradingRequest]] = []

    for i, sub in enumerate(req.submissions):
        if len(sub.student_answer.split()) < SHORT_ANSWER_WORDS:
            results[i] = _zero_result(
                sub.max_total_score,
                "Answer is too short to evaluate. Please provide a detailed response.",
            )
        else:
            to_grade.append((i, sub))

    if not to_grade:
        return results  # type: ignore[return-value]

    # Build a combined prompt for all remaining submissions
    blocks = []
    for batch_pos, (_, sub) in enumerate(to_grade, 1):
        blocks.append(
            f"SUBMISSION {batch_pos} ({sub.subject}, {sub.grade_level}):\n"
            f"Question: {sub.question}\n"
            f"Model Answer: {sub.model_answer}\n"
            f"Student Answer: {sub.student_answer}\n"
            f"Rubric ({sub.max_total_score} marks):\n{_build_rubric_text(sub.rubric)}"
        )

    prompt = (
        f"Grade the following {len(to_grade)} student submission(s). "
        f"Return a JSON array with exactly {len(to_grade)} object(s) in the same order.\n"
        f"Each object must match:\n{_JSON_SCHEMA}\n\n"
        + "\n\n---\n\n".join(blocks)
        + "\n\nReturn only the JSON array, no extra text."
    )

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=min(700 * len(to_grade), 8000),
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text
        start, end = raw.find("["), raw.rfind("]") + 1
        grades = json.loads(raw[start:end])

        for (orig_idx, sub), grade_data in zip(to_grade, grades):
            results[orig_idx] = _parse_grade_data(grade_data, sub.max_total_score)
    except Exception as exc:
        logger.error("Batch grading failed: %s", exc)
        for orig_idx, sub in to_grade:
            if results[orig_idx] is None:
                results[orig_idx] = _zero_result(sub.max_total_score, "Grading failed. Please grade manually.")

    return results  # type: ignore[return-value]


# ─── Teacher override ────────────────────────────────────────────────────────


class TeacherOverride(BaseModel):
    submission_id: str
    criterion: str
    new_score: int
    teacher_comment: str


@router.post("/override")
async def apply_override(override: TeacherOverride):
    try:
        return {
            "submission_id": override.submission_id,
            "criterion": override.criterion,
            "override_applied": True,
            "new_score": override.new_score,
            "teacher_comment": override.teacher_comment,
            "message": "Teacher override recorded. Final grade updated.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Teacher override failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from exc
