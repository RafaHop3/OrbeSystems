import subprocess, json

py_script = """
import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    url = os.environ.get('DATABASE_URL')
    engine = create_async_engine(url)
    try:
        async with engine.begin() as conn:
            try:
                await conn.execute(text("ALTER TABLE inho.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT 'OrbeAdmin';"))
                print("Added to inho")
            except Exception as e:
                print("inho err: ", e)
            try:
                await conn.execute(text("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT 'OrbeAdmin';"))
                print("Added to public")
            except Exception as e:
                print("public err: ", e)
    except Exception as e:
        print("Engine err: ", e)
    await engine.dispose()

asyncio.run(run())
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > async_schema.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "sudo docker compose -f /home/ubuntu/orbe-systems/docker-compose.yml cp async_schema.py inho_backend:/app/async_schema.py",
            "sudo docker compose -f /home/ubuntu/orbe-systems/docker-compose.yml exec -T inho_backend python /app/async_schema.py"
        ]
    }
}

with open("async_req.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://async_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

import time
import sys
for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            with open("async_out.txt", "w", encoding="utf-8") as outf:
                outf.write(data.get("StandardOutputContent", ""))
                outf.write("\n--ERR--\n")
                outf.write(data.get("StandardErrorContent", ""))
            sys.exit(0 if status == 'Success' else 1)

sys.exit(1)
