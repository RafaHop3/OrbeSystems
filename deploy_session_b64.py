import subprocess, json, base64

with open(r"inho_backend\db\session.py", "rb") as f:
    b64_content = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            f"echo '{b64_content}' | base64 --decode > inho_backend/db/session.py",
            "sudo docker compose build inho_backend",
            "sudo docker compose up -d inho_backend"
        ]
    }
}
with open("upload_session_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://upload_session_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(cmd_id)
