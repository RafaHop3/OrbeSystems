import json
import subprocess
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/OrbeSystems",
            "git pull origin main || git fetch origin main && git reset --hard origin/main",
            "cd backend",
            "docker build -t 982534388133.dkr.ecr.us-east-1.amazonaws.com/orbe-systems-api:latest .",
            "cd ..",
            "docker compose down",
            "docker compose up -d",
            "echo 'REMOTE_BUILD_COMPLETE'"
        ]
    }
}

with open("deploy_remote.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

try:
    res = subprocess.check_output(
        ["aws", "ssm", "send-command", "--cli-input-json", "file://deploy_remote.json", "--region", "us-east-1", "--output", "json"],
        text=True
    )
    cmd_id = json.loads(res)["Command"]["CommandId"]
    print(f"Dispatched Command ID: {cmd_id}")
except Exception as e:
    print(f"Error: {e}")
