import psycopg2
import sys

conn_str = "postgresql://postgres:Muhammadalivsroyjonesjr%23Ju.130798@db.bjidrhoniciczqkhazqv.supabase.co:5432/postgres"

print("Connecting to Supabase...")
try:
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute('''
    CREATE TABLE IF NOT EXISTS public.user_roles (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
        role_name VARCHAR NOT NULL
    );
    ''')
    print("Created user_roles")

    cur.execute('''
    CREATE TABLE IF NOT EXISTS public.user_subscriptions (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
        stripe_customer_id VARCHAR UNIQUE,
        stripe_subscription_id VARCHAR UNIQUE,
        subscription_status VARCHAR,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
    );
    ''')
    print("Created user_subscriptions")

    cur.execute('''
    CREATE TABLE IF NOT EXISTS public.security_alerts (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        alert_type VARCHAR NOT NULL,
        severity VARCHAR,
        details VARCHAR,
        created_at TIMESTAMP,
        resolved BOOLEAN
    );
    ''')
    print("Created security_alerts")
    
    cur.execute('''
    CREATE TABLE IF NOT EXISTS public.api_keys (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        key_hash VARCHAR NOT NULL,
        name VARCHAR,
        created_at TIMESTAMP,
        last_used_at TIMESTAMP,
        is_active BOOLEAN
    );
    ''')
    print("Created api_keys")
    
    # Do the same for inho schema which inho_backend uses!
    # Wait, inho_backend uses SCHEMA=inho. SQLAlchemy will try to create everything in inho.
    # We should create schema inho if it doesn't exist.
    cur.execute('CREATE SCHEMA IF NOT EXISTS inho;')
    
    # We don't need to manually create all tables for inho schema because if inho.users doesn't exist,
    # create_all will create it with VARCHAR, then when it does REFERENCES inho.users(id), it should be explicit.
    # Wait, SQLAlchemy generated DDL for inho_backend uses explicit schema on the table (CREATE TABLE inho.users),
    # but does it use explicit schema in the foreign key? (REFERENCES inho.users(id) instead of users).
    # If not, we might need the same for inho. Let's do it just in case!
    
    for tbl_schema in ['inho']:
        cur.execute(f'''
        CREATE TABLE IF NOT EXISTS {tbl_schema}.users (
            id VARCHAR PRIMARY KEY,
            email VARCHAR UNIQUE NOT NULL,
            password_hash VARCHAR NOT NULL,
            role VARCHAR DEFAULT 'user',
            stripe_customer_id VARCHAR,
            subscription_status VARCHAR DEFAULT 'none',
            is_email_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ''')
        cur.execute(f'''
        CREATE TABLE IF NOT EXISTS {tbl_schema}.user_roles (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL UNIQUE REFERENCES {tbl_schema}.users(id) ON DELETE CASCADE,
            role_name VARCHAR NOT NULL
        );
        ''')
    print("Handled inho schema")

    print("All tables created successfully.")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
