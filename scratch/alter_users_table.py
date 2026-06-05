import psycopg2

db_url = "postgresql://postgres:Muhammadalivsroyjonesjr@db.zgdtyzaxoqziroqjqgni.supabase.co:5432/postgres?sslmode=require"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("Altering 'users' table on Supabase...")
    # Add subscription_status if not exists
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'none';")
    print("✅ Added 'subscription_status' column.")
    
    conn.commit()
    cur.close()
    conn.close()
    print("🎉 Alter completed successfully.")
except Exception as e:
    print(f"❌ Error altering table: {e}")
