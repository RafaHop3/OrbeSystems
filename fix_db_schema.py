import subprocess, json

py_script = """
import os
from sqlalchemy import create_engine, text

DB_URL = os.environ.get('DATABASE_URL')
if DB_URL and DB_URL.startswith("postgresql+asyncpg://"):
    DB_URL = DB_URL.replace("+asyncpg", "")

engine = create_engine(DB_URL)

try:
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE inho.users ADD COLUMN full_name VARCHAR(255) DEFAULT 'OrbeAdmin';"))
            print("Added 'full_name' to inho.users")
        except Exception as e:
            print("Schema inho issue:", str(e)[:100])
        
        try:
            conn.execute(text("ALTER TABLE public.users ADD COLUMN full_name VARCHAR(255) DEFAULT 'OrbeAdmin';"))
            print("Added 'full_name' to public.users")
        except Exception as e:
            print("Schema public issue:", str(e)[:100])
except Exception as e:
    print("DB connect error: ", e)
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > fix_schema.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "sudo docker compose -f /home/ubuntu/orbe-systems/docker-compose.yml cp fix_schema.py inho_backend:/app/fix_schema.py",
            "sudo docker compose -f /home/ubuntu/orbe-systems/docker-compose.yml exec -T inho_backend python /app/fix_schema.py || echo EXEC_FAILED"
        ]
    }
}

with open("fix_db_req.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_db_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]
print(f"Command ID: {cmd_id}")

import time
import sys
for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            print("StandardOutputContent:")
            print(data.get("StandardOutputContent"))
            print("StandardErrorContent:")
            print(data.get("StandardErrorContent"))
            sys.exit(0 if status == 'Success' else 1)

print("Timeout waiting")
sys.exit(1)
