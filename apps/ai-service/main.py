from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import (
    predictions,
    bus_routing,
    plagiarism,
    ai_grading,
    analytics,
    anomaly,
    cohort,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predictions.router,  prefix="/predict",    tags=["Predictions"])
app.include_router(bus_routing.router,  prefix="/routing",    tags=["Bus Route Optimisation"])
app.include_router(plagiarism.router,   prefix="/plagiarism", tags=["Plagiarism Detection"])
app.include_router(ai_grading.router,   prefix="/grading",    tags=["AI-Assisted Grading"])
app.include_router(analytics.router,    prefix="/analytics",  tags=["Analytics"])
app.include_router(anomaly.router,      prefix="/anomaly",    tags=["Anomaly Detection"])
app.include_router(cohort.router,       prefix="/cohort",     tags=["Cohort Analysis"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}
