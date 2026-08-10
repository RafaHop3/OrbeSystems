import subprocess
import json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/OrbeSystems || exit 1",
            "sudo docker compose build backend > build_err.log 2>&1",
            "tr -cd '\\11\\12\\15\\40-\\176' < build_err.log > clean_build.log",
            "cat clean_build.log"
        ]
    }
}

with open("ssm_build.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

subprocess.check_call(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_build.json", "--region", "us-east-1"])
print("Build error fetch dispatched!")
