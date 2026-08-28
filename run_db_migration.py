import subprocess, json, time, sys, base64

with open("docker-compose.yml", "rb") as f:
    b = f.read()

compose = b.decode("utf-8", errors="replace")

# Ensure Orbe backend pulls locally
compose = compose.replace("image: 982534388133.dkr.ecr.us-east-1.amazonaws.com/orbe-systems-api:latest", "build: ./backend")

# Migrate INHO Backend to Supabase `.env` mapping
target = """  inho_backend:
    build: ./inho_backend
    container_name: inho_backend
    restart: always
    environment:
      - DATABASE_URL=postgresql+asyncpg://orbe_admin:orbe_password@db:5432/orbesystems
      - REDIS_URL=redis://redis:6379/1
      - SCHEMA=inho
    ports:"""

replacement = """  inho_backend:
    build: ./inho_backend
    container_name: inho_backend
    restart: always
    env_file:
      - ./backend/.env
    environment:
      - REDIS_URL=redis://redis:6379/1
      - SCHEMA=inho
    ports:"""

if target in compose:
    compose = compose.replace(target, replacement)
else:
    print("WARNING: Could not find exact INHO environment block to replace!")

b64_content = base64.b64encode(compose.encode("utf-8")).decode("utf-8")

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            f"echo '{b64_content}' | base64 -d > docker-compose.yml",
            "sudo docker compose up -d --force-recreate inho_backend",
            "sudo docker compose ps"
        ]
    }
}

with open("fix_db_migration_req.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_db_migration_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]
print(f"Command ID: {cmd_id}")

for _ in range(25):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            with open("fix_db_migration_out.txt", "w", encoding="utf-8") as outf:
                outf.write(data.get("StandardOutputContent", ""))
                outf.write("\n--ERR--\n")
                outf.write(data.get("StandardErrorContent", ""))
            print("Status:", status)
            sys.exit(0 if status == 'Success' else 1)

print("Timeout")
sys.exit(1)
