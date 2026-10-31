import sqlite3
import os
import json

db_path = os.path.expandvars(r'%APPDATA%\ModrinthApp\app.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in cur.fetchall()]
    print('Tables in Modrinth app.db:', tables)
    for t in tables:
        cur.execute(f"PRAGMA table_info('{t}');")
        cols = [c[1] for c in cur.fetchall()]
        print(f"Table {t} ({len(cols)} cols): {cols}")
        try:
            cur.execute(f"SELECT COUNT(*) FROM '{t}';")
            count = cur.fetchone()[0]
            print(f"  Rows count: {count}")
            if count > 0:
                cur.execute(f"SELECT * FROM '{t}' LIMIT 2;")
                print(f"  Sample row: {cur.fetchall()}")
        except Exception as e:
            print(f"  Error: {e}")

# Check store directory
store_dir = os.path.expandvars(r'%APPDATA%\ModrinthApp\store')
if os.path.exists(store_dir):
    print('\n=== Store Directory Files ===')
    for f in os.listdir(store_dir):
        print('Store file:', f)
        p = os.path.join(store_dir, f)
        try:
            with open(p, 'r', encoding='utf-8') as sf:
                data = json.load(sf)
                print(f'  Keys in {f}: {list(data.keys()) if isinstance(data, dict) else len(data)}')
        except Exception as e:
            print(f'  Could not parse JSON: {e}')
