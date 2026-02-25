"""
VitaSage AI - update medical_records endpoint to accept authenticated doctors/staff too
Also ensure the table has index on patient_id for performance
"""
import psycopg2

DB = dict(host="localhost", port=5432, dbname="vitasage_271527", user="postgres", password="271527")
conn = psycopg2.connect(**DB)
conn.autocommit = False
cur = conn.cursor()

# Add index if not exists (for fast patient lookup)
cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_medical_records_patient
    ON medical_records(patient_id, patient_source, created_at DESC)
""")
print("[OK] Index on medical_records(patient_id, patient_source) ready")

conn.commit()
cur.close()
conn.close()
print("[DONE] CMMS DB update complete")
