from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, constr, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt

from app.database import get_db
from app.models import RegisteredPatient
from app.config import settings

router = APIRouter(prefix="/patient", tags=["Patient Portal"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=4)


# ── Schemas ───────────────────────────────────────────────
class PatientRegister(BaseModel):
    abha_id: str
    aadhaar_id: str
    name: str
    phone: str
    blood_group: Optional[str] = ""
    allergies: Optional[str] = ""
    medical_notes: Optional[str] = ""
    emergency_contact: Optional[str] = ""
    password: str

    @field_validator("abha_id", "aadhaar_id")
    @classmethod
    def must_be_12_digits(cls, v):
        if not v.isdigit() or len(v) != 12:
            raise ValueError("Must be exactly 12 digits")
        return v

    @field_validator("phone")
    @classmethod
    def must_be_10_digits(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Phone must be exactly 10 digits")
        return v

    @field_validator("password")
    @classmethod
    def min_5_chars(cls, v):
        if len(v) < 5:
            raise ValueError("Password must be at least 5 characters")
        return v


class PatientLoginSchema(BaseModel):
    login_id: str   # ABHA ID or Aadhaar
    password: str


class PatientOut(BaseModel):
    id: int
    abha_id: str
    aadhaar_id: str
    name: str
    phone: str
    blood_group: Optional[str]
    allergies: Optional[str]
    medical_notes: Optional[str]
    emergency_contact: Optional[str]
    created_at: datetime
    class Config: from_attributes = True


def make_patient_token(patient_id: int, name: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode(
        {"sub": str(patient_id), "name": name, "role": "patient", "exp": expire},
        settings.jwt_secret, algorithm=settings.jwt_algorithm
    )


# ── REGISTER ─────────────────────────────────────────────
@router.post("/register", status_code=201)
async def register_patient(
    payload: PatientRegister,
    db: AsyncSession = Depends(get_db),
):
    # Check ABHA duplicate
    res = await db.execute(select(RegisteredPatient).where(RegisteredPatient.abha_id == payload.abha_id))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="ABHA ID already registered")

    # Check Aadhaar duplicate
    res2 = await db.execute(select(RegisteredPatient).where(RegisteredPatient.aadhaar_id == payload.aadhaar_id))
    if res2.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Aadhaar ID already registered")

    patient = RegisteredPatient(
        abha_id=payload.abha_id,
        aadhaar_id=payload.aadhaar_id,
        name=payload.name,
        phone=payload.phone,
        blood_group=payload.blood_group,
        allergies=payload.allergies,
        medical_notes=payload.medical_notes,
        emergency_contact=payload.emergency_contact,
        password_hash=pwd_ctx.hash(payload.password),
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return {"message": "Registration successful", "abha_id": patient.abha_id}


# ── LOGIN ─────────────────────────────────────────────────
@router.post("/login")
async def login_patient(
    payload: PatientLoginSchema,
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import or_
    res = await db.execute(
        select(RegisteredPatient).where(
            or_(
                RegisteredPatient.abha_id == payload.login_id,
                RegisteredPatient.aadhaar_id == payload.login_id,
            )
        )
    )
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=400, detail="Patient not found with that ABHA / Aadhaar ID")
    if not pwd_ctx.verify(payload.password, patient.password_hash):
        raise HTTPException(status_code=400, detail="Invalid password")

    token = make_patient_token(patient.id, patient.name)
    return {
        "message": "Login successful",
        "token": token,
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "abha_id": patient.abha_id,
            "blood_group": patient.blood_group,
            "phone": patient.phone,
        }
    }


# ── PROFILE ───────────────────────────────────────────────
@router.get("/profile/{patient_id}", response_model=PatientOut)
async def get_patient_profile(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(RegisteredPatient).where(RegisteredPatient.id == patient_id))
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
