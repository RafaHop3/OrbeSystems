import psycopg2

conn_str = "postgresql://postgres:Muhammadalivsroyjonesjr%23Ju.130798@db.bjidrhoniciczqkhazqv.supabase.co:5432/postgres"

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    cur.execute("""
        SELECT table_schema, table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name IN ('users', 'user_roles')
        ORDER BY table_schema, table_name;
    """)
    with open("schema_out2.txt", "w") as f:
        f.write("Schema details:\n")
        for row in cur.fetchall():
            f.write(f"{row[0]}.{row[1]}.{row[2]}: {row[3]}\n")
except Exception as e:
    with open("schema_out2.txt", "w") as f:
        f.write(f"Error: {e}")
