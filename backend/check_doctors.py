import psycopg2
DB = dict(host="localhost", port=5432, dbname="vitasage_271527", user="postgres", password="271527")
conn = psycopg2.connect(**DB)
cur = conn.cursor()
cur.execute("SELECT id, username, full_name, role FROM users WHERE role='doctor'")
rows = cur.fetchall()
print("Doctors:", rows)
cur.close()
conn.close()
