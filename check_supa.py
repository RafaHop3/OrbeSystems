from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:5432/postgres"
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public';"))
        for row in res:
            print(f"{row[0]}: {row[1]}")
except Exception as e:
    print(e)
