import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, dbname='vitasage_271527', user='postgres', password='271527')
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")
print("users columns:", [r[0] for r in cur.fetchall()])
cur.close(); conn.close()
