import subprocess, json

py_script = """
import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    url = os.environ.get('DATABASE_URL')
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if "?" in url:
        url = url.split("?")[0]
        
    engine = create_async_engine(url)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT 'OrbeAdmin' NOT NULL;"))
            print("Successfully added full_name to public.users")
    except Exception as e:
        print("Schema public issue:", e)
    await engine.dispose()

asyncio.run(run())
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > run_orbe_schema.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "sudo docker compose cp run_orbe_schema.py orbe_backend:/app/run_orbe_schema.py",
            "sudo docker compose exec -T orbe_backend python /app/run_orbe_schema.py"
        ]
    }
}

with open("fix_db_schema_orbe.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_db_schema_orbe.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

import time
import sys
for _ in range(15):
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
