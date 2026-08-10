import json, subprocess, time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/OrbeSystems",
            "git fetch --all",
            "git reset --hard origin/main",
            "cd backend",
            "docker build -t 982534388133.dkr.ecr.us-east-1.amazonaws.com/orbe-systems-api:latest .",
            "cd ..",
            "docker compose down",
            "docker compose up -d"
        ]
    }
}
with open("ssm_force_deploy.json", "w", encoding="utf-8") as f: json.dump(payload, f)

res = subprocess.check_output(
    ["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_force_deploy.json", "--region", "us-east-1", "--output", "json"],
    text=True
)
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Dispatched Deploy ID: {cmd_id}")
