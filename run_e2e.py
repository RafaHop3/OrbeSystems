import subprocess, json

py_script = """
import os
import bcrypt
import requests

from sqlalchemy import create_engine, text

# Use the environment variable ALREADY inside the container
DB_URL = os.environ.get('DATABASE_URL')
if DB_URL and DB_URL.startswith("postgresql+asyncpg://"):
    DB_URL = DB_URL.replace("+asyncpg", "")

engine = create_engine(DB_URL)

new_pass = "TestOrbe2026@"
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(new_pass.encode(), salt).decode()

try:
    with engine.begin() as conn:
        orbe_admins = conn.execute(text("SELECT id, email, role FROM users WHERE role = 'ADMIN' OR role = 'SUPER_ADMIN'")).fetchall()
        if orbe_admins:
            conn.execute(text("UPDATE users SET hashed_password = :h WHERE email = :e"), {"h": hashed, "e": orbe_admins[0][1]})
            orbe_email = orbe_admins[0][1]
        else:
            orbe_email = None
            
        inho_admins = conn.execute(text("SELECT id, email, role FROM inho.users WHERE role = 'ADMIN' OR role = 'SUPER_ADMIN'")).fetchall()
        if inho_admins:
            conn.execute(text("UPDATE inho.users SET hashed_password = :h WHERE email = :e"), {"h": hashed, "e": inho_admins[0][1]})
            inho_email = inho_admins[0][1]
        else:
            inho_email = None

    print(f"Orbe_Email: {orbe_email}")
    print(f"INHO_Email: {inho_email}")

    if orbe_email:
        print(f"Testing Orbe login for {orbe_email}")
        r1 = requests.post("http://localhost:8000/api/v1/auth/login", json={"email": orbe_email, "password": new_pass})
        print(f"Orbe Login HTTP Status: {r1.status_code}")
        print(f"Orbe Login Body: {r1.text[:200]}")
    
    if inho_email:
        print(f"Testing INHO login for {inho_email}")
        # Assuming INHO API runs on a different host or we can hit the actual DNS since it's production
        r2 = requests.post("https://inho-api.orbesystems.com.br/api/v1/login", json={"email": inho_email, "password": new_pass})
        print(f"INHO Login HTTP Status: {r2.status_code}")
        print(f"INHO Login Body: {r2.text[:200]}")

except Exception as e:
    print("Error:", e)
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > test_e2e.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "sudo docker cp test_e2e.py orbe_backend:/app/test_e2e.py",
            "sudo docker compose exec -T backend python test_e2e.py"
        ]
    }
}

with open("test_e2e_ssm.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://test_e2e_ssm.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]
print(f"Command ID: {cmd_id}")

import time
for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            with open('e2e_dump.txt', 'w', encoding='utf-8') as df: df.write(data.get('StandardOutputContent', '') + '\nERR:\n' + data.get('StandardErrorContent', ''))
            
            
            break
