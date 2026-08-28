import subprocess, json

with open("ec2_compose.yml", "r", encoding="utf-8") as f:
    text = f.read()

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > docker-compose.yml\n" + text.replace('$', '\\$') + "\nEOF",
            "sudo docker compose up -d backend inho_backend"
        ]
    }
}
with open("upload_compose_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://upload_compose_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(cmd_id)
