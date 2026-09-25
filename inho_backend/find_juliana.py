import sqlite3
import os

db_paths = [
    "D:/OrbeSystems/orbe-systems/inho_backend/test_inho.db", 
    "D:/OrbeSystems/orbe-systems/inho_backend/test_webhook_ephemeral.db"
]

for db_path in db_paths:
    if not os.path.exists(db_path):
        print(f"DB not found: {db_path}")
        continue

    print(f"\n--- Checking DB: {db_path} ---")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cur.fetchall()

    for t in tables:
        table_name = t[0]
        try:
            cur.execute(f"PRAGMA table_info({table_name})")
            columns = cur.fetchall()
            col_names = [c[1] for c in columns]
            
            text_cols = [c[1] for c in columns if 'text' in c[2].lower() or 'char' in c[2].lower() or 'varchar' in c[2].lower()]
            if not text_cols:
                text_cols = col_names
            
            conditions = " OR ".join([f"{col} LIKE '%Juliana%'" for col in text_cols])
            cur.execute(f"SELECT * FROM {table_name} WHERE {conditions}")
            rows = cur.fetchall()
            if rows:
                print(f"Found in {table_name}: {rows}")
        except Exception as e:
            pass

    conn.close()
