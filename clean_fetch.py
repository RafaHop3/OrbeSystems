import subprocess
import json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/OrbeSystems/backend || exit 1",
            "docker compose logs --no-log-prefix --no-color --tail 50 backend > raw.log",
            "tr -cd '\\11\\12\\15\\40-\\176' < raw.log > clean.log",
            "cat clean.log"
        ]
    }
}

with open("ssm_clean.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

subprocess.check_call(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_clean.json", "--region", "us-east-1"])
print("Clean fetch dispatched!")
