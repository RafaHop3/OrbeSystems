import subprocess
import json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo fallocate -l 2G /swapfile || true",
            "sudo chmod 600 /swapfile || true",
            "sudo mkswap /swapfile || true",
            "sudo swapon /swapfile || true",
            "cd /home/ubuntu/OrbeSystems/backend",
            "sudo docker compose down || true",
            "sudo docker builder prune -af > /dev/null 2>&1",
            "sudo docker compose up -d --build > /dev/null 2>&1",
            "echo 'RECOVERY_AND_BUILD_DONE'"
        ]
    }
}

with open("auto_recover.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

subprocess.check_call(["aws", "ssm", "send-command", "--cli-input-json", "file://auto_recover.json", "--region", "us-east-1"])
print("Auto-Recovery with Swap Memory Dispatched Successfully!")
