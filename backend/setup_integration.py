"""
VitaSage AI -- Patient-Doctor Integration Setup
Creates: patient_diagnosis_reports table
Run: python setup_integration.py
"""
import psycopg2

DB_HOST="localhost"; DB_PORT=5432
DB_NAME="vitasage_271527"; DB_USER="postgres"; DB_PASSWORD="271527"

print("\nVitaSage AI -- Integration Setup")
print("=" * 50)

conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
conn.autocommit = False
cur = conn.cursor()
print("[OK] Connected")

# patient_diagnosis_reports table
cur.execute("""
CREATE TABLE IF NOT EXISTS patient_diagnosis_reports (
    id               SERIAL PRIMARY KEY,
    patient_id       INT NOT NULL,
    patient_source   VARCHAR(20) NOT NULL DEFAULT 'registered',
    doctor_id        INT REFERENCES users(id) ON DELETE SET NULL,
    sugar_level      VARCHAR(20),
    blood_pressure   VARCHAR(20),
    diagnosis        TEXT NOT NULL,
    notes            TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)""")
print("[OK] patient_diagnosis_reports table ready")

conn.commit()
cur.close()
conn.close()
print("\n[DONE] Integration Setup Complete!")
print("  Doctors can now write diagnosis reports for portal patients")
print("=" * 50)
