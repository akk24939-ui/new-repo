"""
Module 4 Setup: Advanced Prescription + Lab Report tables
"""
import psycopg2, json

DB = dict(host="localhost", port=5432, dbname="vitasage_271527", user="postgres", password="271527")
conn = psycopg2.connect(**DB)
conn.autocommit = False
cur = conn.cursor()

# ── 1. advanced_prescriptions ─────────────────────────────
cur.execute("""
    CREATE TABLE IF NOT EXISTS advanced_prescriptions (
        id                 SERIAL PRIMARY KEY,
        patient_id         INTEGER NOT NULL,
        patient_source     VARCHAR(20) DEFAULT 'registered',
        doctor_id          INTEGER REFERENCES users(id),
        doctor_name        VARCHAR(120),
        diagnosis          TEXT NOT NULL,
        medicines          JSONB NOT NULL DEFAULT '[]',
        advice             TEXT,
        follow_up_date     DATE,
        digital_signature  VARCHAR(255),
        rx_number          VARCHAR(30) UNIQUE,
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_adv_rx_patient
    ON advanced_prescriptions(patient_id, patient_source, created_at DESC)
""")
print("[OK] advanced_prescriptions table ready")

# ── 2. lab_reports ────────────────────────────────────────
cur.execute("""
    CREATE TABLE IF NOT EXISTS lab_reports (
        id             SERIAL PRIMARY KEY,
        patient_id     INTEGER NOT NULL,
        patient_source VARCHAR(20) DEFAULT 'registered',
        staff_id       INTEGER REFERENCES users(id),
        staff_name     VARCHAR(120),
        test_name      VARCHAR(100) NOT NULL,
        test_results   JSONB,
        remarks        TEXT,
        file_name      VARCHAR(255),
        file_path      VARCHAR(500),
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_lab_reports_patient
    ON lab_reports(patient_id, patient_source, created_at DESC)
""")
print("[OK] lab_reports table ready")

conn.commit()
cur.close()
conn.close()
print("[DONE] Module 4 DB setup complete")
