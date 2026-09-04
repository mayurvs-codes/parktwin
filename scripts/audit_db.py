import sqlite3
con = sqlite3.connect('parktwin.db')
cur = con.cursor()
tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("TABLES FOUND:", tables)
for t in tables:
    cnt = cur.execute(f'SELECT count() FROM "{t}"').fetchone()[0]
    cols = [c[1] for c in cur.execute(f'PRAGMA table_info("{t}")').fetchall()]
    print(f"Table [{t}]: {cnt} records")
    print(f"   Columns: {', '.join(cols)}")
    if 0 < cnt <= 10:
        rows = cur.execute(f'SELECT * FROM "{t}"').fetchall()
        for r in rows:
            print(f"   Row: {r}")
con.close()
