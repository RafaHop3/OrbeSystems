import json
import subprocess
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/OrbeSystems",
            "git pull origin main",
            "docker compose down",
            "docker compose build backend",
            "docker compose up -d",
            "echo 'BACKEND_DEPLOY_COMPLETE'"
        ]
    }
}

with open("deploy_backend.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

try:
    res = subprocess.check_output(
        ["aws", "ssm", "send-command", "--cli-input-json", "file://deploy_backend.json", "--region", "us-east-1", "--output", "json"],
        text=True
    )
    cmd_id = json.loads(res)["Command"]["CommandId"]
    print(f"Dispatched Command ID: {cmd_id}")
    time.sleep(3)
    
    out = subprocess.check_output(
        ["aws", "ssm", "list-command-invocations", "--command-id", cmd_id, "--details", "--output", "json"],
        text=True
    )
    inv = json.loads(out)
    if "CommandInvocations" in inv and len(inv["CommandInvocations"]) > 0:
        status = inv["CommandInvocations"][0]["Status"]
        print(f"Status: {status}")
except Exception as e:
    print(f"Error: {e}")
