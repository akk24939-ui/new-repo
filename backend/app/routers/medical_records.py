import os, uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/medical-records", tags=["UMAVS - Medical Records"])

UPLOAD_DIR = "uploads/medical"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _require_role(user, *roles):
    if user.role not in roles:
        raise HTTPException(status_code=403, detail=f"Access denied. Required role: {', '.join(roles)}")


# ── POST /upload-record ────────────────────────────────────
# Doctor: all fields. Staff: only sugar, bp, file (diagnosis/suggestion nulled server-side)
@router.post("/upload-record", status_code=201)
async def upload_record(
    patient_id:     int   = Form(...),
    patient_source: str   = Form("registered"),
    sugar_level:    Optional[str] = Form(None),
    blood_pressure: Optional[str] = Form(None),
    diagnosis:      Optional[str] = Form(None),
    suggestion:     Optional[str] = Form(None),
    file_category:  Optional[str] = Form("General"),
    file: Optional[UploadFile] = File(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_role(current_user, "doctor", "staff", "admin")

    # RBAC: strip doctor-only fields for staff
    if current_user.role == "staff":
        diagnosis  = None
        suggestion = None

    # Save file
    saved_name = saved_path = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1]
        saved_name = file.filename
        saved_path = f"medical/{uuid.uuid4().hex}{ext}"
        full_path  = os.path.join("uploads", saved_path)
        with open(full_path, "wb") as f:
            content = await file.read()
            f.write(content)

    await db.execute(text("""
        INSERT INTO medical_records
            (patient_id, patient_source, uploaded_by, uploaded_by_role,
             sugar_level, blood_pressure, diagnosis, suggestion,
             file_name, file_path, file_category)
        VALUES
            (:pid, :src, :uid, :role,
             :sugar, :bp, :diag, :sugg,
             :fname, :fpath, :fcat)
    """), {
        "pid":   patient_id,
        "src":   patient_source,
        "uid":   current_user.id,
        "role":  current_user.role,
        "sugar": sugar_level,
        "bp":    blood_pressure,
        "diag":  diagnosis,
        "sugg":  suggestion,
        "fname": saved_name,
        "fpath": saved_path,
        "fcat":  file_category,
    })
    await db.commit()
    return {"message": "Medical record saved successfully"}


# ── GET /patient-records/{source}/{patient_id} ────────────
# Patient-accessible: returns full timeline
@router.get("/patient-records/{patient_source}/{patient_id}")
async def get_patient_records(
    patient_source: str,
    patient_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        SELECT
            r.id, r.patient_id, r.patient_source,
            r.uploaded_by_role, r.sugar_level, r.blood_pressure,
            r.diagnosis, r.suggestion,
            r.file_name, r.file_path, r.file_category,
            r.created_at,
            u.full_name AS uploader_name
        FROM medical_records r
        LEFT JOIN users u ON u.id = r.uploaded_by
        WHERE r.patient_id = :pid AND r.patient_source = :src
        ORDER BY r.created_at DESC
    """), {"pid": patient_id, "src": patient_source})

    rows = result.mappings().all()
    return [dict(row) for row in rows]


# ── GET /download/{record_id} ──────────────────────────────
@router.get("/download/{record_id}")
async def download_record_file(
    record_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("SELECT file_name, file_path FROM medical_records WHERE id = :rid"),
        {"rid": record_id}
    )
    row = result.mappings().first()
    if not row or not row["file_path"]:
        raise HTTPException(status_code=404, detail="No file attached to this record")
    full = os.path.join("uploads", row["file_path"])
    if not os.path.exists(full):
        raise HTTPException(status_code=404, detail="File not found on server")
    return FileResponse(full, filename=row["file_name"])
