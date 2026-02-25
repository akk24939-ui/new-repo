"""
VitaSage AI -- Patient Portal Setup
Creates: registered_patients table
Run: python setup_patient_portal.py
"""
import sys
try:
    import psycopg2
    from passlib.context import CryptContext
except ImportError as e:
    print(f"[ERROR] {e}")
    sys.exit(1)

DB_HOST="localhost"; DB_PORT=5432
DB_NAME="vitasage_271527"; DB_USER="postgres"; DB_PASSWORD="271527"
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

print("\nVitaSage AI -- Patient Portal Setup")
print("=" * 50)

conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
conn.autocommit = False
cur = conn.cursor()
print("[OK] Connected to database")

cur.execute("""
CREATE TABLE IF NOT EXISTS registered_patients (
    id               SERIAL PRIMARY KEY,
    abha_id          VARCHAR(12) UNIQUE NOT NULL,
    aadhaar_id       VARCHAR(12) UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    phone            VARCHAR(15) NOT NULL,
    blood_group      VARCHAR(5),
    allergies        TEXT,
    medical_notes    TEXT,
    emergency_contact VARCHAR(15),
    password_hash    TEXT NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)""")
print("[OK] registered_patients table ready")

conn.commit()
cur.close()
conn.close()

print("\n[DONE] Patient Portal Setup Complete!")
print("  Patients can now register at /patient-login")
print("=" * 50)
