import subprocess
import json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "df -h",
            "docker ps -a",
            "sudo systemctl status docker --no-pager"
        ]
    }
}

with open("ssm_diag.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

subprocess.check_call(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_diag.json", "--region", "us-east-1"])
print("Diagnostico SSM disparado para AWS!")
