"""
Module 5 — Smart Medication Reminder & Pill Adherence Tracking
Patient: set reminder time, mark taken, view stock
Doctor:  view patient adherence logs + percentage
"""
import traceback
from datetime import datetime, date as dt_date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db

router = APIRouter(prefix="/meds", tags=["Module 5 - Medication Reminders"])


# ── Schemas ───────────────────────────────────────────────
class ReminderCreate(BaseModel):
    patient_id: int
    patient_source: str = "registered"
    rx_id: Optional[int] = None
    medicine_name: str
    reminder_time: Optional[str] = None  # "HH:MM"
    total_stock: int = 0
    remaining_stock: int = 0


class ReminderTimeUpdate(BaseModel):
    reminder_time: str   # "HH:MM"


class StockUpdate(BaseModel):
    total_stock: int
    remaining_stock: int


# ── POST /meds/reminder  — Patient sets a reminder ────────
@router.post("/reminder", status_code=201)
async def create_reminder(
    payload: ReminderCreate,
    db: AsyncSession = Depends(get_db),
):
    """Patient creates a reminder for a medicine (linked to an RX or standalone)."""
    try:
        result = await db.execute(text("""
            INSERT INTO medication_reminders
                (patient_id, patient_source, rx_id, medicine_name,
                 reminder_time, total_stock, remaining_stock)
            VALUES
                (:pid, :src, :rxid, :mname,
                 :rtime::time, :stock, :rem)
            RETURNING id
        """), {
            "pid":   payload.patient_id,
            "src":   payload.patient_source,
            "rxid":  payload.rx_id,
            "mname": payload.medicine_name,
            "rtime": payload.reminder_time or None,
            "stock": payload.total_stock,
            "rem":   payload.remaining_stock,
        })
        new_id = result.scalar()
        await db.commit()
        return {"message": "Reminder created", "reminder_id": new_id}
    except Exception as e:
        await db.rollback()
        print(f"[MEDS ERROR] {traceback.format_exc()}")
        raise HTTPException(500, f"Database error: {str(e)}")


# ── GET /meds/reminders/{source}/{patient_id} — Patient sees their reminders ─
@router.get("/reminders/{patient_source}/{patient_id}")
async def get_reminders(
    patient_source: str,
    patient_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        SELECT
            r.id, r.medicine_name, r.reminder_time,
            r.total_stock, r.remaining_stock, r.rx_id, r.is_active,
            COALESCE(
                (SELECT COUNT(*) FROM medication_logs l
                 WHERE l.reminder_id = r.id AND l.status = 'taken'),
                0
            ) AS taken_count,
            COALESCE(
                (SELECT COUNT(*) FROM medication_logs l
                 WHERE l.reminder_id = r.id AND l.status = 'missed'),
                0
            ) AS missed_count,
            (SELECT l.status FROM medication_logs l
             WHERE l.reminder_id = r.id AND l.log_date = CURRENT_DATE
             LIMIT 1) AS today_status
        FROM medication_reminders r
        WHERE r.patient_id = :pid AND r.patient_source = :src AND r.is_active = TRUE
        ORDER BY r.reminder_time ASC NULLS LAST
    """), {"pid": patient_id, "src": patient_source})
    rows = [dict(r) for r in result.mappings().all()]
    # Convert time object to string for JSON
    for r in rows:
        if r.get("reminder_time"):
            r["reminder_time"] = str(r["reminder_time"])[:5]  # "HH:MM"
    return rows


# ── PUT /meds/reminder/{id}/time — Patient updates alarm time ─
@router.put("/reminder/{reminder_id}/time")
async def update_reminder_time(
    reminder_id: int,
    payload: ReminderTimeUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        await db.execute(text("""
            UPDATE medication_reminders
            SET reminder_time = :rtime::time
            WHERE id = :rid
        """), {"rtime": payload.reminder_time, "rid": reminder_id})
        await db.commit()
        return {"message": "Reminder time updated"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, f"Database error: {str(e)}")


# ── POST /meds/taken/{reminder_id} — Patient marks medicine taken ─
@router.post("/taken/{reminder_id}")
async def mark_taken(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Decrements stock, logs status = 'taken' for today."""
    try:
        # Fetch current stock
        res = await db.execute(text("""
            SELECT remaining_stock FROM medication_reminders WHERE id = :rid
        """), {"rid": reminder_id})
        row = res.fetchone()
        if not row:
            raise HTTPException(404, "Reminder not found")

        remaining = row[0]
        new_remaining = max(0, remaining - 1)

        # Update stock
        await db.execute(text("""
            UPDATE medication_reminders
            SET remaining_stock = :rem
            WHERE id = :rid
        """), {"rem": new_remaining, "rid": reminder_id})

        # Log today's dose (upsert by checking if log exists today)
        existing = await db.execute(text("""
            SELECT id FROM medication_logs
            WHERE reminder_id = :rid AND log_date = CURRENT_DATE
        """), {"rid": reminder_id})
        ex_row = existing.fetchone()

        if ex_row:
            await db.execute(text("""
                UPDATE medication_logs SET status='taken', taken_at=NOW()
                WHERE id = :lid
            """), {"lid": ex_row[0]})
        else:
            # Get patient_id from reminder
            pres = await db.execute(text(
                "SELECT patient_id FROM medication_reminders WHERE id=:rid"
            ), {"rid": reminder_id})
            pid = pres.scalar()
            await db.execute(text("""
                INSERT INTO medication_logs (reminder_id, patient_id, status, taken_at, log_date)
                VALUES (:rid, :pid, 'taken', NOW(), CURRENT_DATE)
            """), {"rid": reminder_id, "pid": pid})

        await db.commit()

        msg = "Medicine marked as taken"
        if new_remaining == 0:
            msg += " | ⚠️ Out of stock"
        elif new_remaining <= 2:
            msg += f" | ⚠️ Low stock: {new_remaining} left"

        return {"message": msg, "remaining_stock": new_remaining}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"[TAKEN ERROR] {traceback.format_exc()}")
        raise HTTPException(500, f"Database error: {str(e)}")


# ── POST /meds/missed/{reminder_id} — System auto-logs missed ─
@router.post("/missed/{reminder_id}")
async def mark_missed(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Called when patient doesn't respond after alarm window."""
    try:
        existing = await db.execute(text("""
            SELECT id FROM medication_logs
            WHERE reminder_id = :rid AND log_date = CURRENT_DATE
        """), {"rid": reminder_id})
        ex_row = existing.fetchone()
        if ex_row:
            return {"message": "Already logged today"}

        pres = await db.execute(text(
            "SELECT patient_id FROM medication_reminders WHERE id=:rid"
        ), {"rid": reminder_id})
        pid = pres.scalar()
        if not pid:
            raise HTTPException(404, "Reminder not found")

        await db.execute(text("""
            INSERT INTO medication_logs (reminder_id, patient_id, status, log_date)
            VALUES (:rid, :pid, 'missed', CURRENT_DATE)
        """), {"rid": reminder_id, "pid": pid})
        await db.commit()
        return {"message": "Dose logged as missed"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, f"Database error: {str(e)}")


# ── GET /meds/adherence/{source}/{patient_id} — Doctor views adherence ─
@router.get("/adherence/{patient_source}/{patient_id}")
async def get_adherence(
    patient_source: str,
    patient_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Returns per-reminder adherence summary for a patient."""
    result = await db.execute(text("""
        SELECT
            r.id AS reminder_id,
            r.medicine_name,
            r.reminder_time,
            r.remaining_stock,
            r.total_stock,
            COUNT(l.id) FILTER (WHERE l.status='taken') AS taken_count,
            COUNT(l.id) FILTER (WHERE l.status='missed') AS missed_count,
            COUNT(l.id) AS total_logs,
            ROUND(
                COUNT(l.id) FILTER (WHERE l.status='taken') * 100.0
                / NULLIF(COUNT(l.id), 0), 1
            ) AS adherence_pct,
            json_agg(
                json_build_object(
                    'date', l.log_date,
                    'status', l.status,
                    'taken_at', l.taken_at
                ) ORDER BY l.log_date DESC
            ) FILTER (WHERE l.id IS NOT NULL) AS log_history
        FROM medication_reminders r
        LEFT JOIN medication_logs l ON l.reminder_id = r.id
        WHERE r.patient_id = :pid AND r.patient_source = :src
        GROUP BY r.id
        ORDER BY r.reminder_time ASC NULLS LAST
    """), {"pid": patient_id, "src": patient_source})

    rows = [dict(r) for r in result.mappings().all()]
    for r in rows:
        if r.get("reminder_time"):
            r["reminder_time"] = str(r["reminder_time"])[:5]
        if r.get("adherence_pct") is None:
            r["adherence_pct"] = 0
    return rows
