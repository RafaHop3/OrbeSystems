import subprocess, json, time, sys, base64

with open("docker-compose.yml", "rb") as f:
    b = f.read()

compose = b.decode("utf-8", errors="replace")
compose = compose.replace("image: 982534388133.dkr.ecr.us-east-1.amazonaws.com/orbe-systems-api:latest", "build: ./backend")

b64_content = base64.b64encode(compose.encode("utf-8")).decode("utf-8")

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            f"echo '{b64_content}' | base64 -d > docker-compose.yml",
            "sudo docker builder prune -af",
            "sudo docker compose build --no-cache inho_backend",
            "sudo docker compose up -d --force-recreate inho_backend",
            "sudo docker compose ps"
        ]
    }
}

with open("push_clean_compose.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://push_clean_compose.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Command ID: {cmd_id}")

for _ in range(30):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            with open("push_clean_out.txt", "w", encoding="utf-8") as outf:
                outf.write(data.get("StandardOutputContent", ""))
                outf.write("\n--ERR--\n")
                outf.write(data.get("StandardErrorContent", ""))
            print("Status:", status)
            sys.exit(0 if status == 'Success' else 1)

print("Timeout")
sys.exit(1)
