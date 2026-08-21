import psycopg2
import sys

def main():
    db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"
    
    lockdown_sql = """
    -- Force RLS to be active
    ALTER TABLE inho.users ENABLE ROW LEVEL SECURITY;
    
    -- Sweep any previous rogue overlapping insert policies on inho.users
    DROP POLICY IF EXISTS "Deny all inserts" ON inho.users;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON inho.users;
    
    -- Enforce absolute blackout for client-side API insertion
    CREATE POLICY "Deny all inserts" 
    ON inho.users 
    FOR INSERT 
    WITH CHECK (false);
    
    -- Print current policies verification
    SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'inho.users'::regclass;
    """

    print("Connecting to Supabase Database to enforce Superuser RLS Lockdown...")
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        
        cur.execute(lockdown_sql)
        print("SQL executed successfully.")
        
        # Verify the policies
        for row in cur.fetchall():
            print(f"- Policy: {row[0]} | Cmd: {row[1]}")
            
        cur.close()
        conn.close()
        print("Database rules safely configured!")
    except Exception as e:
        print(f"Error locking down DB: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
