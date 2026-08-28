import base64
import subprocess, json, time, sys

def get_b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

b64_models = get_b64(r"d:\OrbeSystems\orbe-systems\inho_backend\models\models.py")
b64_billing = get_b64(r"d:\OrbeSystems\orbe-systems\inho_backend\routers\billing.py")
b64_messaging = get_b64(r"d:\OrbeSystems\orbe-systems\inho_backend\services\messaging.py")

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo mkdir -p /tmp/inho_fsm",
            f"echo '{b64_models}' | base64 -d > /tmp/inho_fsm/models.py",
            f"echo '{b64_billing}' | base64 -d > /tmp/inho_fsm/billing.py",
            f"echo '{b64_messaging}' | base64 -d > /tmp/inho_fsm/messaging.py",
            
            "sudo docker cp /tmp/inho_fsm/models.py inho_backend:/app/models/models.py",
            "sudo docker cp /tmp/inho_fsm/billing.py inho_backend:/app/routers/billing.py",
            "sudo docker cp /tmp/inho_fsm/messaging.py inho_backend:/app/services/messaging.py",
            
            # Restart Application to pick up code
            "sudo docker restart inho_backend",
            
            # Create the missing tables natively via SQLAlchemy
            """sudo docker exec inho_backend python -c '
import asyncio
from db.session import engine
from models.models import Base

async def init_missing_tables():
    async with engine.begin() as conn:
        print("[DB] Running create_all...")
        await conn.run_sync(Base.metadata.create_all)
        print("[DB] Missing tables created successfully.")

asyncio.run(init_missing_tables())
            ' """,
            "echo 'DONE DEPLOYING FSM FIX'"
        ]
    }
}

with open("deploy_fsm_b2b2c.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://deploy_fsm_b2b2c.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Wait...")
for _ in range(30):
    time.sleep(3)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent", ""))
            print("-- ERR --")
            print(data.get("StandardErrorContent", ""))
            sys.exit(0)
print("Timeout")
sys.exit(1)
