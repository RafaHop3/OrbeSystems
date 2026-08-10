import subprocess
import json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/OrbeSystems/backend || exit 1",
            "docker compose logs --tail 30 backend > error.log 2>&1",
            "base64 -w 0 error.log"
        ]
    }
}

with open("ssm_b64.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

subprocess.check_call(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_b64.json", "--region", "us-east-1"])
print("B64 Fetch Dispatched!")
