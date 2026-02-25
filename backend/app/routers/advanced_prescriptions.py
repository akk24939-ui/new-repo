"""
Module 4A — Advanced Prescription Management System
Doctor-only: create immutable prescriptions with JSONB medicine array & digital signature.
Staff + Patient: view only.
"""
import uuid
from typing import Optional, List
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.dependencies import require_doctor, require_staff, get_current_user

router = APIRouter(prefix="/rx", tags=["Module 4A - Advanced Prescriptions"])


# ── Schemas ───────────────────────────────────────────────
class Medicine(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = ""

class PrescriptionCreate(BaseModel):
    patient_id: int
    patient_source: str = "registered"
    diagnosis: str
    medicines: List[Medicine]
    advice: Optional[str] = None
    follow_up_date: Optional[date] = None


# ── POST /rx/create (Doctor only) ─────────────────────────
@router.post("/create", status_code=201)
async def create_prescription(
    payload: PrescriptionCreate,
    current_user=Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    if not payload.diagnosis.strip():
        raise HTTPException(400, "Diagnosis is required")
    if not payload.medicines:
        raise HTTPException(400, "At least one medicine is required")

    # Unique prescription number: RX-YYYYMMDD-XXXX
    rx_number = f"RX-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    # Null-safe: fall back to username if full_name not set
    doctor_display = current_user.full_name or current_user.username or "Doctor"
    # Avoid double 'Dr.' prefix if full_name already starts with it
    if doctor_display.startswith('Dr.'):
        digital_sig = doctor_display
    else:
        digital_sig = f"Dr. {doctor_display}"

    import json, traceback
    medicines_json = json.dumps([m.model_dump() for m in payload.medicines])

    try:
        await db.execute(text("""
            INSERT INTO advanced_prescriptions
                (patient_id, patient_source, doctor_id, doctor_name,
                 diagnosis, medicines, advice, follow_up_date,
                 digital_signature, rx_number)
            VALUES
                (:pid, :src, :did, :dname,
                 :diag, CAST(:meds AS jsonb), :advice, :followup,
                 :sig, :rxn)
        """), {
            "pid":     payload.patient_id,
            "src":     payload.patient_source,
            "did":     current_user.id,
            "dname":   doctor_display,
            "diag":    payload.diagnosis,
            "meds":    medicines_json,
            "advice":  payload.advice,
            "followup": str(payload.follow_up_date) if payload.follow_up_date else None,
            "sig":     digital_sig,
            "rxn":     rx_number,
        })
        await db.commit()
    except Exception as e:
        await db.rollback()
        print(f"[RX ERROR] {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return {
        "message": "Prescription generated successfully",
        "rx_number": rx_number,
        "digital_signature": digital_sig,
        "medicines_count": len(payload.medicines),
    }


# ── GET /rx/patient/{source}/{id} (Doctor + Staff + Patient) ─
@router.get("/patient/{patient_source}/{patient_id}")
async def get_prescriptions(
    patient_source: str,
    patient_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Accessible to doctors, staff, and patients (no auth required at API level — 
       frontend passes auth but we keep this open so patients can call it too)."""
    result = await db.execute(text("""
        SELECT
            id, patient_id, patient_source,
            doctor_id, doctor_name,
            diagnosis, medicines, advice,
            follow_up_date, digital_signature, rx_number,
            created_at
        FROM advanced_prescriptions
        WHERE patient_id = :pid AND patient_source = :src
        ORDER BY created_at DESC
    """), {"pid": patient_id, "src": patient_source})

    rows = result.mappings().all()
    out = []
    for r in rows:
        row = dict(r)
        # medicines comes back as dict already from JSONB, ensure list
        if isinstance(row.get("medicines"), str):
            import json
            row["medicines"] = json.loads(row["medicines"])
        out.append(row)
    return out
