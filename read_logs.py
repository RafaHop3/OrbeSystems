import subprocess
import json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/OrbeSystems || exit 1",
            "docker compose logs --tail 50 backend",
            "docker ps -a"
        ]
    }
}

with open("read_logs.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

subprocess.check_call(["aws", "ssm", "send-command", "--cli-input-json", "file://read_logs.json", "--region", "us-east-1", "--output", "json"])
print("Logs query dispatched!")
