"""
VitaSage AI -- UMAVS Setup
Creates: medical_records table (unified doctor+staff records visible to patients)
Run: python setup_umavs.py
"""
import psycopg2, os

DB = dict(host="localhost", port=5432, dbname="vitasage_271527", user="postgres", password="271527")

print("\nVitaSage AI -- UMAVS Setup")
print("=" * 50)
conn = psycopg2.connect(**DB)
conn.autocommit = False
cur = conn.cursor()
print("[OK] Connected")

cur.execute("""
CREATE TABLE IF NOT EXISTS medical_records (
    id               SERIAL PRIMARY KEY,
    patient_id       INTEGER NOT NULL,
    patient_source   VARCHAR(20) NOT NULL DEFAULT 'registered',
    uploaded_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_by_role VARCHAR(10) NOT NULL CHECK (uploaded_by_role IN ('doctor','staff')),
    sugar_level      VARCHAR(20),
    blood_pressure   VARCHAR(20),
    diagnosis        TEXT,
    suggestion       TEXT,
    file_name        VARCHAR(255),
    file_path        TEXT,
    file_category    VARCHAR(50) DEFAULT 'General',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
print("[OK] medical_records table ready")

os.makedirs("uploads/medical", exist_ok=True)
print("[OK] uploads/medical/ folder ready")

conn.commit()
cur.close()
conn.close()
print("\n[DONE] UMAVS Setup Complete!")
print("  Doctors and Staff can now write unified records")
print("  Patients can view full timeline from /patient-dashboard")
print("=" * 50)
