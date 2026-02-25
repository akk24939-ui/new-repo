"""
SCAM — Staff Controlled Access Module
Dedicated endpoints with explicit staff-role guards.
These complement the existing /medical-records/* endpoints.
"""
import os, uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/staff", tags=["SCAM - Staff Controlled Access"])

UPLOAD_DIR = "uploads/medical"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _staff_only(user):
    """Guard: raise 403 if caller is not a staff member."""
    if user.role not in ("staff",):
        raise HTTPException(status_code=403, detail="Access denied — staff role required")


# ── 1. Fetch Patient (Staff Only) ─────────────────────────
# Searches registered_patients (portal) and patient_master (hospital) by ABHA / Aadhaar
@router.get("/fetch/{patient_id}")
async def staff_fetch_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _staff_only(current_user)

    # Try registered patients first (portal)
    result = await db.execute(text("""
        SELECT id, full_name AS name, abha_id, blood_group, phone, emergency_contact,
               'registered' AS source
        FROM registered_patients
        WHERE abha_id = :q OR aadhaar_number = :q
        LIMIT 1
    """), {"q": patient_id})
    row = result.mappings().first()

    if not row:
        # Try hospital master
        result = await db.execute(text("""
            SELECT id, patient_name AS name, abha_id, blood_group,
                   emergency_contact, 'master' AS source
            FROM patient_master
            WHERE abha_id = :q OR aadhaar_id = :q
            LIMIT 1
        """), {"q": patient_id})
        row = result.mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Patient not found with this ABHA / Aadhaar ID")

    return dict(row)


# ── 2. Upload Lab Report + Vitals (Staff Only) ────────────
# Diagnosis and suggestion are BLOCKED — server enforced, not just UI.
@router.post("/upload-lab", status_code=201)
async def staff_upload_lab(
    patient_id:     int            = Form(...),
    patient_source: str            = Form("registered"),
    sugar_level:    Optional[str]  = Form(None),
    blood_pressure: Optional[str]  = Form(None),
    file_category:  Optional[str]  = Form("Lab Report"),
    file: Optional[UploadFile]     = File(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _staff_only(current_user)

    if not sugar_level and not blood_pressure and (not file or not file.filename):
        raise HTTPException(status_code=400, detail="Provide at least sugar level, BP, or a file")

    # Save file
    saved_name = saved_path = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1]
        saved_name = file.filename
        saved_path = f"medical/{uuid.uuid4().hex}{ext}"
        full_path  = os.path.join("uploads", saved_path)
        with open(full_path, "wb") as fp:
            content = await file.read()
            fp.write(content)

    await db.execute(text("""
        INSERT INTO medical_records
            (patient_id, patient_source, uploaded_by, uploaded_by_role,
             sugar_level, blood_pressure,
             diagnosis, suggestion,
             file_name, file_path, file_category, file_type)
        VALUES
            (:pid, :src, :uid, 'staff',
             :sugar, :bp,
             NULL, NULL,
             :fname, :fpath, :fcat, 'lab_report')
    """), {
        "pid":   patient_id,
        "src":   patient_source,
        "uid":   current_user.id,
        "sugar": sugar_level,
        "bp":    blood_pressure,
        "fname": saved_name,
        "fpath": saved_path,
        "fcat":  file_category,
    })
    await db.commit()
    return {"message": "Lab report uploaded successfully", "role": "staff", "diagnosis": None, "suggestion": None}


# ── 3. View All Records (Staff Read-Only) ─────────────────
# Staff can see ALL records — doctor prescriptions, diagnoses, other lab reports
# But cannot modify any of them.
@router.get("/view-records/{patient_source}/{patient_id}")
async def staff_view_records(
    patient_source: str,
    patient_id:     int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _staff_only(current_user)

    result = await db.execute(text("""
        SELECT
            r.id,
            r.patient_id,
            r.patient_source,
            r.uploaded_by_role,
            r.sugar_level,
            r.blood_pressure,
            r.diagnosis,
            r.suggestion,
            r.file_name,
            r.file_path,
            r.file_category,
            r.file_type,
            r.created_at,
            u.full_name AS uploader_name
        FROM medical_records r
        LEFT JOIN users u ON u.id = r.uploaded_by
        WHERE r.patient_id = :pid AND r.patient_source = :src
        ORDER BY r.created_at DESC
    """), {"pid": patient_id, "src": patient_source})

    rows = result.mappings().all()
    return {
        "total": len(rows),
        "staff_note": "View only — diagnosis and suggestion are doctor-authored and cannot be modified",
        "records": [dict(r) for r in rows],
    }
