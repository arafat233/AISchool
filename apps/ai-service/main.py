import os
import logging
import secrets
from fastapi import FastAPI, Depends, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from routers import (
    predictions,
    bus_routing,
    plagiarism,
    ai_grading,
    analytics,
    anomaly,
    cohort,
    rag_ingest,
    rag_query,
    rag_chat,
)
from services.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="School ERP — AI / ML Service",
    description="Predictive analytics, AI-assisted grading, route optimisation, plagiarism detection, anomaly detection, cohort analysis",
    version="1.0.0",
    lifespan=lifespan,
)

_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:4000,http://localhost:4001,http://localhost:4002,http://localhost:4003,http://localhost:4004")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

_AI_SERVICE_KEY = os.getenv("AI_SERVICE_API_KEY", "")
_api_key_header = APIKeyHeader(name="X-AI-Service-Key", auto_error=False)


async def require_internal_key(key: str | None = Security(_api_key_header)):
    if not _AI_SERVICE_KEY:
        raise RuntimeError("AI_SERVICE_API_KEY env var is not set")
    if not key or not secrets.compare_digest(key, _AI_SERVICE_KEY):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing AI service API key")


_auth = [Depends(require_internal_key)]

app.include_router(predictions.router,  prefix="/predict",    tags=["Predictions"],               dependencies=_auth)
app.include_router(bus_routing.router,  prefix="/routing",    tags=["Bus Route Optimisation"],    dependencies=_auth)
app.include_router(plagiarism.router,   prefix="/plagiarism", tags=["Plagiarism Detection"],      dependencies=_auth)
app.include_router(ai_grading.router,   prefix="/grading",    tags=["AI-Assisted Grading"],       dependencies=_auth)
app.include_router(analytics.router,    prefix="/analytics",  tags=["Analytics"],                 dependencies=_auth)
app.include_router(anomaly.router,      prefix="/anomaly",    tags=["Anomaly Detection"],         dependencies=_auth)
app.include_router(cohort.router,       prefix="/cohort",     tags=["Cohort Analysis"],           dependencies=_auth)
app.include_router(rag_ingest.router,   prefix="/rag",        tags=["RAG — Ingest"],              dependencies=_auth)
app.include_router(rag_query.router,    prefix="/rag",        tags=["RAG — Query"],               dependencies=_auth)
app.include_router(rag_chat.router,     prefix="/rag",        tags=["RAG — Chat"],                dependencies=_auth)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}
