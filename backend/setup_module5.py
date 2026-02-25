"""
VitaSage AI — Module 5: Smart Medication Reminder & Pill Adherence Tracking
Creates: medication_reminders, medication_logs tables
Run: python setup_module5.py
"""
import psycopg2

DB = dict(host="localhost", port=5432, dbname="vitasage_271527", user="postgres", password="271527")

print("\nVitaSage AI — Module 5: Medication Reminder Setup")
print("=" * 55)
conn = psycopg2.connect(**DB)
conn.autocommit = False
cur = conn.cursor()
print("[OK] Connected")

# ── 1. medication_reminders ────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS medication_reminders (
    id               SERIAL PRIMARY KEY,
    patient_id       INTEGER NOT NULL,
    patient_source   VARCHAR(20) DEFAULT 'registered',
    rx_id            INTEGER,                       -- references advanced_prescriptions.id (nullable)
    medicine_name    VARCHAR(150) NOT NULL,
    reminder_time    TIME,                          -- HH:MM patient sets this
    total_stock      INTEGER DEFAULT 0,
    remaining_stock  INTEGER DEFAULT 0,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
print("[OK] medication_reminders table ready")

cur.execute("""
CREATE INDEX IF NOT EXISTS idx_med_reminders_patient
    ON medication_reminders(patient_id, patient_source, is_active)
""")

# ── 2. medication_logs ─────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS medication_logs (
    id          SERIAL PRIMARY KEY,
    reminder_id INTEGER REFERENCES medication_reminders(id) ON DELETE CASCADE,
    patient_id  INTEGER NOT NULL,
    status      VARCHAR(10) NOT NULL CHECK (status IN ('taken','missed')),
    taken_at    TIMESTAMP,
    log_date    DATE DEFAULT CURRENT_DATE
)
""")
print("[OK] medication_logs table ready")

cur.execute("""
CREATE INDEX IF NOT EXISTS idx_med_logs_reminder
    ON medication_logs(reminder_id, log_date DESC)
""")

cur.execute("""
CREATE INDEX IF NOT EXISTS idx_med_logs_patient
    ON medication_logs(patient_id, log_date DESC)
""")

conn.commit()
cur.close()
conn.close()
print("\n[DONE] Module 5 DB setup complete")
print("=" * 55)
