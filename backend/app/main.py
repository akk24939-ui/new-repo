from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.database import engine, Base
from app.routers import auth, hospitals, users, patients, suggestions, prescriptions, reports, staff, vitals, patient_portal, patient_records, medical_records, staff_records, advanced_prescriptions, lab_reports, medication_reminders

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="VitaSage AI",
    description="Hospital Management SaaS — Auth + Doctor Portal + Staff Portal + Patient Portal",
    version="7.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# All routers
app.include_router(auth.router)
app.include_router(hospitals.router)
app.include_router(users.router)
app.include_router(patients.router)
app.include_router(suggestions.router)
app.include_router(prescriptions.router)
app.include_router(reports.router)
app.include_router(staff.router)
app.include_router(vitals.router)
app.include_router(patient_portal.router)
app.include_router(patient_records.router)
app.include_router(medical_records.router)
app.include_router(staff_records.router)        # SCAM
app.include_router(advanced_prescriptions.router)  # Module 4A
app.include_router(lab_reports.router)             # Module 4B
app.include_router(medication_reminders.router)    # Module 5


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "VitaSage AI", "version": "8.0.0"}


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response
