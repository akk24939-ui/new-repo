from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, text
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.dependencies import require_doctor
from app.models import RegisteredPatient

router = APIRouter(prefix="/patient-records", tags=["Patient-Doctor Integration"])


# ─── Schemas ─────────────────────────────────────────────
class DiagnosisCreate(BaseModel):
    patient_id: int
    patient_source: str          # "registered" | "master"
    sugar_level: Optional[str] = None
    blood_pressure: Optional[str] = None
    diagnosis: str
    notes: Optional[str] = None


class DiagnosisOut(BaseModel):
    id: int
    patient_id: int
    patient_source: str
    doctor_id: Optional[int]
    sugar_level: Optional[str]
    blood_pressure: Optional[str]
    diagnosis: str
    notes: Optional[str]
    created_at: datetime
    class Config: from_attributes = True


# ─── Search both tables ───────────────────────────────────
@router.get("/search")
async def search_any_patient(
    query: str,
    current_user=Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Search registered_patients AND patient_master by ABHA or Aadhaar."""
    if len(query) != 12 or not query.isdigit():
        raise HTTPException(status_code=400, detail="Must be exactly 12 digits")

    # 1️⃣ Search registered_patients first
    res = await db.execute(
        select(RegisteredPatient).where(
            or_(RegisteredPatient.abha_id == query, RegisteredPatient.aadhaar_id == query)
        )
    )
    reg_patient = res.scalar_one_or_none()
    if reg_patient:
        return {
            "source": "registered",
            "id": reg_patient.id,
            "abha_id": reg_patient.abha_id,
            "name": reg_patient.name,
            "blood_group": reg_patient.blood_group or "—",
            "allergies": reg_patient.allergies or "None",
            "medical_notes": reg_patient.medical_notes or "None",
            "emergency_contact": reg_patient.emergency_contact or "—",
            "phone": reg_patient.phone,
        }

    # 2️⃣ Search patient_master
    from app.models import PatientMaster
    res2 = await db.execute(
        select(PatientMaster).where(
            or_(PatientMaster.abha_id == query, PatientMaster.aadhaar == query)
        )
    )
    master_patient = res2.scalar_one_or_none()
    if master_patient:
        return {
            "source": "master",
            "id": master_patient.id,
            "abha_id": master_patient.abha_id,
            "name": master_patient.name,
            "blood_group": master_patient.blood_group or "—",
            "allergies": master_patient.allergies or "None",
            "medical_notes": master_patient.chronic_conditions or "None",
            "emergency_contact": master_patient.emergency_contact or "—",
            "risk_level": master_patient.risk_level,
        }

    raise HTTPException(status_code=404, detail="No patient found with that ABHA / Aadhaar ID")


# ─── Add Diagnosis Report ─────────────────────────────────
@router.post("/diagnosis", status_code=201)
async def add_diagnosis(
    payload: DiagnosisCreate,
    current_user=Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    if not payload.diagnosis.strip():
        raise HTTPException(status_code=400, detail="Diagnosis text is required")

    await db.execute(
        text("""
            INSERT INTO patient_diagnosis_reports
                (patient_id, patient_source, doctor_id, sugar_level, blood_pressure, diagnosis, notes)
            VALUES (:pid, :src, :did, :sugar, :bp, :diag, :notes)
        """),
        {
            "pid":   payload.patient_id,
            "src":   payload.patient_source,
            "did":   current_user.id,
            "sugar": payload.sugar_level,
            "bp":    payload.blood_pressure,
            "diag":  payload.diagnosis,
            "notes": payload.notes,
        }
    )
    await db.commit()
    return {"message": "Diagnosis report saved successfully"}


# ─── Get Diagnosis Reports for a patient ─────────────────
@router.get("/diagnosis/{patient_source}/{patient_id}")
async def get_diagnosis_reports(
    patient_source: str,
    patient_id: int,
    current_user=Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            SELECT r.id, r.patient_id, r.patient_source, r.doctor_id,
                   r.sugar_level, r.blood_pressure, r.diagnosis, r.notes,
                   r.created_at, u.full_name as doctor_name
            FROM patient_diagnosis_reports r
            LEFT JOIN users u ON u.id = r.doctor_id
            WHERE r.patient_id = :pid AND r.patient_source = :src
            ORDER BY r.created_at DESC
        """),
        {"pid": patient_id, "src": patient_source}
    )
    rows = result.mappings().all()
    return [dict(row) for row in rows]
