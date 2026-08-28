import subprocess, json

with open("inho_backend/db/session.py", "rb") as f:
    text = f.read().decode("utf-8", errors="replace")

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > inho_backend/db/session.py\n" + text.replace('$', '\\$') + "\nEOF",
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
