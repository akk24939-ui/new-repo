"""
SCAM setup: adds file_type column to medical_records for lab_report/prescription distinction
"""
import psycopg2

DB = dict(host="localhost", port=5432, dbname="vitasage_271527", user="postgres", password="271527")
conn = psycopg2.connect(**DB)
conn.autocommit = False
cur = conn.cursor()

cur.execute("""
    ALTER TABLE medical_records
    ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'lab_report'
""")
print("[OK] file_type column added to medical_records")

conn.commit()
cur.close()
conn.close()
print("[DONE] SCAM DB update complete")
