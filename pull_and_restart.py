import json, subprocess, time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems || exit 1",
            "git fetch --all",
            "git reset --hard origin/main",
            "docker compose build backend",
            "docker compose up -d backend"
        ]
    }
}
with open("ssm_deploy.json", "w", encoding="utf-8") as f: json.dump(payload, f)

res = subprocess.check_output(
    ["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_deploy.json", "--region", "us-east-1", "--output", "json"],
    text=True
)
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Deploying backend via EC2... CMD_ID: {cmd_id}")
time.sleep(20)

out = subprocess.check_output(
    f"aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json",
    shell=True
)
data = json.loads(out.decode('utf-8', errors='replace'))
print("=== Output ===")
print(data.get("StandardOutputContent", ""))
print("=== Error (if any) ===")
print(data.get("StandardErrorContent", ""))
