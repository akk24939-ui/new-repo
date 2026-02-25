"""
VitaSage AI -- Reset All Demo Users
Creates/resets: admin/271527, akash/271527 (doctor), staff/271527
Run: python reset_users.py
"""
import sys
try:
    import psycopg2
    from passlib.context import CryptContext
except ImportError:
    print("[ERROR] Run: pip install psycopg2-binary passlib[bcrypt]")
    sys.exit(1)

DB_HOST="localhost"; DB_PORT=5432
DB_NAME="vitasage_271527"; DB_USER="postgres"; DB_PASSWORD="271527"
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

print("\nVitaSage AI -- Reset Demo Users")
print("=" * 50)

conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
conn.autocommit = False
cur = conn.cursor()
print("[OK] Connected")

# Ensure Hospital 101 exists
cur.execute("SELECT id FROM hospitals WHERE hospital_id = %s", ("101",))
hosp = cur.fetchone()
if not hosp:
    cur.execute(
        "INSERT INTO hospitals (hospital_id, name, email, address) VALUES (%s,%s,%s,%s) RETURNING id",
        ("101","VitaSage Hospital 101","admin101@vitasage.com","101 Health Avenue")
    )
    hosp_id = cur.fetchone()[0]
    print("[OK] Hospital 101 created")
else:
    hosp_id = hosp[0]
    print(f"[OK] Hospital 101 (id={hosp_id})")

USERS = [
    # (username, email, hashed_pw, role, full_name)
    ("admin",  "admin@vitasage.com",  pwd_ctx.hash("271527"), "admin",  "Admin User"),
    ("akash",  "akash@vitasage.com",  pwd_ctx.hash("271527"), "doctor", "Dr. Akash Kumar"),
    ("staff",  "staff@vitasage.com",  pwd_ctx.hash("271527"), "staff",  "Staff Member"),
]

for (username, email, pw_hash, role, full_name) in USERS:
    cur.execute("SELECT id FROM users WHERE username = %s", (username,))
    existing = cur.fetchone()
    if existing:
        cur.execute(
            "UPDATE users SET password_hash=%s, role=%s, full_name=%s, status=true WHERE username=%s",
            (pw_hash, role, full_name, username)
        )
        print(f"[OK] '{username}' updated (role={role})")
    else:
        cur.execute(
            "INSERT INTO users (hospital_id, username, email, password_hash, role, full_name)"
            " VALUES (%s,%s,%s,%s,%s,%s)",
            (hosp_id, username, email, pw_hash, role, full_name)
        )
        print(f"[OK] '{username}' created (role={role})")

conn.commit()
cur.close()
conn.close()

print("\n[DONE] All users ready!")
print("=" * 50)
print("  Admin   -> Hospital: 101 | User: admin  | Pass: 271527")
print("  Doctor  -> Hospital: 101 | User: akash  | Pass: 271527")
print("  Staff   -> Hospital: 101 | User: staff  | Pass: 271527")
print("=" * 50)
