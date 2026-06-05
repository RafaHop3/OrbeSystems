"""
Script de diagnóstico local — NUNCA commitar credenciais.
Uso: DATABASE_URL="postgresql://..." python scratch/test_db.py
"""
import os
import sys

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import psycopg2
except ImportError:
    print("Instale psycopg2-binary: pip install psycopg2-binary")
    sys.exit(1)

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("Defina DATABASE_URL no ambiente antes de executar.")
    sys.exit(1)

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
if "sslmode" not in db_url:
    sep = "&" if "?" in db_url else "?"
    db_url += f"{sep}sslmode=require"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    tables = cur.fetchall()
    print("Tables in 'public' schema:")
    for t in tables:
        print(f"  - {t[0]}")

    cur.execute("""
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    """)
    rls_status = cur.fetchall()
    print("\nRLS status:")
    for name, enabled in rls_status:
        flag = "ENABLED" if enabled else "DISABLED [!]"
        print(f"  - {name}: {flag}")

    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
