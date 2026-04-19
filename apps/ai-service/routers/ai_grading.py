"""
AI-Assisted Grading using Claude API.
Scores long-form answers against a teacher-provided rubric.
Teacher reviews → accepts / modifies / overrides.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os
from anthropic import Anthropic

router = APIRouter()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


class RubricCriterion(BaseModel):
    name: str              # e.g. "Content Accuracy"
    max_score: int
    description: str       # what full marks look like


class GradingRequest(BaseModel):
    question: str
    student_answer: str
    model_answer: str
    rubric: list[RubricCriterion]
    max_total_score: int
    subject: str
    grade_level: str       # e.g. "Grade 10"


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
    confidence: str        # HIGH / MEDIUM / LOW
    teacher_override_applied: bool = False


@router.post("/grade", response_model=GradingResult)
async def grade_answer(req: GradingRequest):
    rubric_text = "\n".join(
        f"  - {c.name} ({c.max_score} marks): {c.description}" for c in req.rubric
    )

    prompt = f"""You are an expert teacher grading a student answer for {req.subject} (Grade: {req.grade_level}).

QUESTION:
{req.question}

MODEL ANSWER (reference):
{req.model_answer}

STUDENT ANSWER:
{req.student_answer}

RUBRIC (total {req.max_total_score} marks):
{rubric_text}

Please evaluate the student's answer and respond in JSON with this exact structure:
{{
  "criteria_scores": [
    {{"criterion": "<name>", "awarded": <int>, "max_score": <int>, "justification": "<why>"}}
  ],
  "key_points_covered": ["<point 1>", "..."],
  "key_points_missed": ["<point 1>", "..."],
  "language_score": <int 0-10>,
  "feedback": "<2-3 sentences of constructive feedback for the student>",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}}

Be fair, specific, and educational. Award partial credit where deserved."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        import json
        raw = message.content[0].text
        # Extract JSON
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end])

        criteria_scores = [CriterionScore(**cs) for cs in data.get("criteria_scores", [])]
        content_score = sum(cs.awarded for cs in criteria_scores)
        lang_score = int(data.get("language_score", 5))
        total = content_score  # language is advisory only
        pct = round(total / req.max_total_score * 100, 1)

        return GradingResult(
            content_score=content_score,
            language_score=lang_score,
            total_score=total,
            max_score=req.max_total_score,
            percentage=pct,
            criteria_scores=criteria_scores,
            key_points_covered=data.get("key_points_covered", []),
            key_points_missed=data.get("key_points_missed", []),
            feedback=data.get("feedback", ""),
            confidence=data.get("confidence", "MEDIUM"),
        )
    except Exception as e:
        # Graceful fallback — return zeroed result with error
        return GradingResult(
            content_score=0, language_score=0, total_score=0,
            max_score=req.max_total_score, percentage=0,
            criteria_scores=[], key_points_covered=[], key_points_missed=[],
            feedback=f"Grading failed: {str(e)[:100]}. Please grade manually.",
            confidence="LOW",
        )


class TeacherOverride(BaseModel):
    submission_id: str
    criterion: str
    new_score: int
    teacher_comment: str


@router.post("/override")
async def apply_override(override: TeacherOverride):
    """Teacher accepts/modifies AI-suggested scores. Returns updated result."""
    # In production: persist override to DB and recalculate totals
    return {
        "submission_id": override.submission_id,
        "criterion": override.criterion,
        "override_applied": True,
        "new_score": override.new_score,
        "teacher_comment": override.teacher_comment,
        "message": "Teacher override recorded. Final grade updated.",
    }
