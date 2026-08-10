import subprocess
import json

# Get ECR token
token_out = subprocess.check_output(["aws", "ecr", "get-login-password", "--region", "us-east-1"]).decode("utf-8").strip()

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu",
            "rm -rf OrbeSystems",
            "git clone -b dev https://github.com/RafaHop3/OrbeSystems.git",
            "cd OrbeSystems/backend",
            "echo 'ADMIN_USERNAME=rafael_admin' > .env",
            "echo 'ADMIN_PASSWORD_HASH=\\$2b\\$12\\$dt2akEmXomjncqjFltAMMe3C44fxRrXfbL0NFCkvRH6JPR9UYWmXy' >> .env",
            "echo 'SECRET_KEY=supersecretkeyfortestingonly123' >> .env",
            "echo 'FRONTEND_URL=https://orbesystems.com.br' >> .env",
            "cd /home/ubuntu/OrbeSystems",
            f"docker login --username AWS --password {token_out} 982534388133.dkr.ecr.us-east-1.amazonaws.com",
            "docker compose pull",
            "docker compose down || true",
            "docker compose up -d"
        ]
    }
}

with open("ultimate_ssm.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

subprocess.check_call(["aws", "ssm", "send-command", "--cli-input-json", "file://ultimate_ssm.json", "--region", "us-east-1"])
print("Ultimate recovery SSM dispatched!")
