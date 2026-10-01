import psycopg2
db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Forcing structural DDL replace on public.audit_logs")
try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS public.audit_logs CASCADE;")
    print("Table dropped.")
    
    cur.execute("""
    CREATE TABLE public.audit_logs (
        id UUID PRIMARY KEY,
        business_id UUID,
        user_id UUID,
        user_name VARCHAR(255),
        user_role VARCHAR(100),
        action auditaction NOT NULL,
        entity VARCHAR(100) NOT NULL,
        entity_id UUID,
        detail TEXT,
        ip_address VARCHAR(45),
        user_agent VARCHAR(512),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    """)
    print("Table reconstructed perfectly.")
except Exception as e:
    print(e)
