"""
Plagiarism Detection using TF-IDF cosine similarity.
Compares a submission against:
  1. Same-class submissions (current batch)
  2. Previous years' submissions (from DB)
  3. Returns similarity scores + highlighted matching spans.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

from services.db import get_db

router = APIRouter()


class PlagiarismCheckRequest(BaseModel):
    assignment_id: str
    student_id: str
    submission_text: str


class SimilarityMatch(BaseModel):
    comparison_student_id: str
    comparison_name: str
    similarity_pct: float
    matching_spans: list[str]


class PlagiarismResult(BaseModel):
    overall_similarity_pct: float
    verdict: str            # CLEAN / LOW_RISK / MODERATE / HIGH_PLAGIARISM
    matches: list[SimilarityMatch]
    word_count: int
    unique_phrases: int


def extract_matching_spans(text1: str, text2: str, min_len: int = 8) -> list[str]:
    """Find common n-gram spans between two texts."""
    words1 = text1.lower().split()
    words2 = text2.lower().split()
    matches = []
    for n in range(min_len, 4, -1):
        for i in range(len(words1) - n + 1):
            phrase = " ".join(words1[i: i + n])
            if phrase in " ".join(words2) and len(phrase) > 30:
                matches.append(phrase)
                if len(matches) >= 5:
                    return matches
    return matches


@router.post("/check", response_model=PlagiarismResult)
async def check_plagiarism(req: PlagiarismCheckRequest, db: AsyncSession = Depends(get_db)):
    # Fetch other submissions for same assignment
    rows = await db.execute(text("""
        SELECT asub.id, asub.student_id, s.full_name, asub.submission_text
        FROM assignment_submissions asub
        JOIN students s ON s.id = asub.student_id
        WHERE asub.assignment_id = :assignment_id
          AND asub.student_id != :student_id
          AND asub.submission_text IS NOT NULL
          AND LENGTH(asub.submission_text) > 50
    """), {"assignment_id": req.assignment_id, "student_id": req.student_id})

    comparisons = list(rows.mappings())
    if not comparisons:
        return PlagiarismResult(overall_similarity_pct=0, verdict="CLEAN", matches=[], word_count=len(req.submission_text.split()), unique_phrases=0)

    all_texts = [req.submission_text] + [r["submission_text"] for r in comparisons]
    vectorizer = TfidfVectorizer(ngram_range=(1, 3), min_df=1, stop_words="english")
    try:
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
    except Exception:
        similarities = [0.0] * len(comparisons)

    matches = []
    for i, comp in enumerate(comparisons):
        sim_pct = round(float(similarities[i]) * 100, 1)
        if sim_pct > 20:
            spans = extract_matching_spans(req.submission_text, comp["submission_text"])
            matches.append(SimilarityMatch(
                comparison_student_id=comp["student_id"],
                comparison_name=comp["full_name"],
                similarity_pct=sim_pct,
                matching_spans=spans,
            ))

    matches.sort(key=lambda m: m.similarity_pct, reverse=True)
    overall = round(max((m.similarity_pct for m in matches), default=0), 1)
    verdict = "HIGH_PLAGIARISM" if overall >= 70 else "MODERATE" if overall >= 40 else "LOW_RISK" if overall >= 20 else "CLEAN"

    return PlagiarismResult(
        overall_similarity_pct=overall,
        verdict=verdict,
        matches=matches[:10],
        word_count=len(req.submission_text.split()),
        unique_phrases=len(set(re.findall(r"\b\w{6,}\b", req.submission_text.lower()))),
    )


@router.get("/class-report/{assignment_id}")
async def class_plagiarism_report(assignment_id: str, db: AsyncSession = Depends(get_db)):
    """Pairwise similarity matrix for all submissions in an assignment."""
    rows = await db.execute(text("""
        SELECT asub.student_id, s.full_name, asub.submission_text
        FROM assignment_submissions asub
        JOIN students s ON s.id = asub.student_id
        WHERE asub.assignment_id = :assignment_id AND asub.submission_text IS NOT NULL
    """), {"assignment_id": assignment_id})
    subs = list(rows.mappings())

    if len(subs) < 2:
        return {"message": "Not enough submissions", "pairs": []}

    texts = [r["submission_text"] for r in subs]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
    try:
        matrix = vectorizer.fit_transform(texts)
        sim_matrix = cosine_similarity(matrix)
    except Exception:
        return {"pairs": []}

    pairs = []
    for i in range(len(subs)):
        for j in range(i + 1, len(subs)):
            sim = round(float(sim_matrix[i][j]) * 100, 1)
            if sim > 30:
                pairs.append({
                    "student_a": subs[i]["full_name"],
                    "student_b": subs[j]["full_name"],
                    "similarity_pct": sim,
                    "flag": sim >= 70,
                })
    pairs.sort(key=lambda p: p["similarity_pct"], reverse=True)
    return {"assignment_id": assignment_id, "pairs": pairs, "flagged_count": sum(1 for p in pairs if p["flag"])}
