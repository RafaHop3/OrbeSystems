import subprocess
import json
import os

token_out = subprocess.check_output(["aws", "ecr", "get-login-password", "--region", "us-east-1"]).decode("utf-8").strip()

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/OrbeSystems/backend || cd /home/ubuntu/OrbeSystems",
            f"docker login --username AWS --password {token_out} 982534388133.dkr.ecr.us-east-1.amazonaws.com",
            "docker compose pull",
            "docker compose up -d"
        ]
    }
}

with open("ssm_deploy_smart.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

subprocess.check_call(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_deploy_smart.json", "--region", "us-east-1"])
print("SSM disparado para AWS ECR com sucesso!")
