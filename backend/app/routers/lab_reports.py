"""
Module 4B — Advanced Lab Report Management System
Staff-only: upload structured lab reports with JSONB test results.
Doctors + Patients: view only.
"""
import os, uuid, json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.dependencies import require_staff

router = APIRouter(prefix="/lab", tags=["Module 4B - Lab Reports"])

UPLOAD_DIR = "uploads/lab"
os.makedirs(UPLOAD_DIR, exist_ok=True)

LAB_FIELDS = ["hemoglobin", "wbc", "platelets", "sugar_fasting", "blood_pressure",
              "creatinine", "uric_acid", "cholesterol", "thyroid_tsh", "vitamin_d"]


# ── POST /lab/upload (Staff only) ─────────────────────────
@router.post("/upload", status_code=201)
async def upload_lab_report(
    patient_id:     int           = Form(...),
    patient_source: str           = Form("registered"),
    test_name:      str           = Form(...),
    # Individual test fields (all optional)
    hemoglobin:     Optional[str] = Form(None),
    wbc:            Optional[str] = Form(None),
    platelets:      Optional[str] = Form(None),
    sugar_fasting:  Optional[str] = Form(None),
    blood_pressure: Optional[str] = Form(None),
    creatinine:     Optional[str] = Form(None),
    uric_acid:      Optional[str] = Form(None),
    cholesterol:    Optional[str] = Form(None),
    thyroid_tsh:    Optional[str] = Form(None),
    vitamin_d:      Optional[str] = Form(None),
    remarks:        Optional[str] = Form(None),
    file: Optional[UploadFile]    = File(None),
    current_user=Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    # Build JSONB test_results from filled fields
    local_vars = {
        "hemoglobin": hemoglobin, "wbc": wbc, "platelets": platelets,
        "sugar_fasting": sugar_fasting, "blood_pressure": blood_pressure,
        "creatinine": creatinine, "uric_acid": uric_acid,
        "cholesterol": cholesterol, "thyroid_tsh": thyroid_tsh,
        "vitamin_d": vitamin_d,
    }
    LABELS = {
        "hemoglobin": "Hemoglobin (g/dL)", "wbc": "WBC (/mcL)",
        "platelets": "Platelets (/mcL)", "sugar_fasting": "Sugar Fasting (mg/dL)",
        "blood_pressure": "Blood Pressure (mmHg)", "creatinine": "Creatinine (mg/dL)",
        "uric_acid": "Uric Acid (mg/dL)", "cholesterol": "Cholesterol (mg/dL)",
        "thyroid_tsh": "Thyroid TSH (mIU/L)", "vitamin_d": "Vitamin D (ng/mL)",
    }
    test_results = {LABELS[k]: v for k, v in local_vars.items() if v and v.strip()}

    if not test_results and (not file or not file.filename):
        raise HTTPException(400, "Enter at least one test value or upload a report file")

    # Save file
    saved_name = saved_path = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1]
        saved_name = file.filename
        saved_path = f"lab/{uuid.uuid4().hex}{ext}"
        full_path  = os.path.join("uploads", saved_path)
        with open(full_path, "wb") as fp:
            content = await file.read()
            fp.write(content)

    await db.execute(text("""
        INSERT INTO lab_reports
            (patient_id, patient_source, staff_id, staff_name,
             test_name, test_results, remarks, file_name, file_path)
        VALUES
            (:pid, :src, :sid, :sname,
             :tname, CAST(:results AS jsonb), :remarks, :fname, :fpath)
    """), {
        "pid":     patient_id,
        "src":     patient_source,
        "sid":     current_user.id,
        "sname":   current_user.full_name,
        "tname":   test_name,
        "results": json.dumps(test_results),
        "remarks": remarks,
        "fname":   saved_name,
        "fpath":   saved_path,
    })
    await db.commit()
    return {
        "message": "Lab report uploaded successfully",
        "test_name": test_name,
        "results_count": len(test_results),
        "file_uploaded": bool(saved_name),
    }


# ── GET /lab/patient/{source}/{id} (Doctor + Staff + Patient) ─
@router.get("/patient/{patient_source}/{patient_id}")
async def get_lab_reports(
    patient_source: str,
    patient_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        SELECT
            id, patient_id, patient_source,
            staff_id, staff_name,
            test_name, test_results, remarks,
            file_name, file_path, created_at
        FROM lab_reports
        WHERE patient_id = :pid AND patient_source = :src
        ORDER BY created_at DESC
    """), {"pid": patient_id, "src": patient_source})

    rows = result.mappings().all()
    out = []
    for r in rows:
        row = dict(r)
        if isinstance(row.get("test_results"), str):
            row["test_results"] = json.loads(row["test_results"])
        out.append(row)
    return out


# ── GET /lab/download/{id} ────────────────────────────────
from fastapi.responses import FileResponse

@router.get("/download/{report_id}")
async def download_lab_file(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("SELECT file_name, file_path FROM lab_reports WHERE id = :rid"),
        {"rid": report_id}
    )
    row = result.mappings().first()
    if not row or not row["file_path"]:
        raise HTTPException(404, "No file attached to this report")
    full = os.path.join("uploads", row["file_path"])
    if not os.path.exists(full):
        raise HTTPException(404, "File not found on server")
    return FileResponse(full, filename=row["file_name"])
