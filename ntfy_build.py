import subprocess
import json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/OrbeSystems/backend || exit 1",
            "sudo docker compose up -d --build backend > build_crash.log 2>&1",
            "curl -T build_crash.log https://ntfy.sh/orbe-rafael-logs-12346"
        ]
    }
}

with open("ssm_ntfy_build.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

subprocess.check_call(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_ntfy_build.json", "--region", "us-east-1"])
print("Build Exfiltration Dispatched!")
