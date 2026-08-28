import psycopg2
import bcrypt
import requests

DB_URL = "postgresql://postgres:Muhammadalivsroyjonesjr@db.zgdtyzaxoqziroqjqgni.supabase.co:5432/postgres?sslmode=require"
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

new_pass = "TestOrbe2026@"
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(new_pass.encode(), salt).decode()

# Orbe Hub Admins
cur.execute("SELECT id, email, role FROM users WHERE role = 'ADMIN' OR role = 'SUPER_ADMIN'")
orbe_admins = cur.fetchall()
print("Orbe Admins:", orbe_admins)
if orbe_admins:
    cur.execute("UPDATE users SET hashed_password = %s WHERE email = %s", (hashed, orbe_admins[0][1]))
    orbe_email = orbe_admins[0][1]
else:
    # insert one if not exists
    print("No Orbe Admins found!")
    orbe_email = None

# INHO Admins
try:
    cur.execute("SELECT id, email, role FROM inho.users WHERE role = 'ADMIN' OR role = 'SUPER_ADMIN'")
    inho_admins = cur.fetchall()
    print("INHO Admins:", inho_admins)
    if inho_admins:
        cur.execute("UPDATE inho.users SET hashed_password = %s WHERE email = %s", (hashed, inho_admins[0][1]))
        inho_email = inho_admins[0][1]
    else:
        print("No INHO Admins found!")
        inho_email = None
except Exception as e:
    print("Error querying INHO:", e)
    conn.rollback()

conn.commit()
cur.close()
conn.close()

results = []

# Test E2E - Orbe Backend (port 8000 via API or PROXY?)
if orbe_email:
    print(f"\n--- Testing Orbe Hub login for {orbe_email} ---")
    try:
        r = requests.post("https://orbesystems.com.br/api/v1/auth/login", json={"email": orbe_email, "password": new_pass})
        print("Orbe Hub Response:", r.status_code, r.text[:200])
        results.append(f"Orbe Hub login for {orbe_email}: {r.status_code}")
    except Exception as e:
        print("Fail Orbe Hub:", e)

# Test E2E - INHO Backend (https://inho-api.orbesystems.com.br/api/v1/login)
if inho_email:
    print(f"\n--- Testing INHO login for {inho_email} ---")
    try:
        r = requests.post("https://inho-api.orbesystems.com.br/api/v1/login", json={"email": inho_email, "password": new_pass})
        print("INHO Response:", r.status_code, r.text[:200])
        results.append(f"INHO login for {inho_email}: {r.status_code}")
    except Exception as e:
        print("Fail INHO:", e)

with open("e2e_results.txt", "w") as f:
    f.write("\n".join(results))
