import subprocess, json, time, sys, base64

with open("docker-compose.yml", "rb") as f:
    compose_b64 = base64.b64encode(f.read()).decode("utf-8")

patch_script = """
import os

fpath = "/home/ubuntu/orbe-systems/inho_backend/db/session.py"
if os.path.exists(fpath):
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # The fix logic natively mapping any postgresql:// to postgresql+asyncpg://
    fix = '''
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
    **engine_kwargs
)'''
    # We replace the static creation
    vulnerable = '''engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)'''
    if vulnerable in content:
        content = content.replace(vulnerable, fix)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print("Successfully patched session.py!")
    else:
        print("WARNING: Vulnerable string not found in session.py")
else:
    print("WARNING: session.py not found on host!")
"""
patch_b64 = base64.b64encode(patch_script.encode("utf-8")).decode("utf-8")

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            f"echo '{compose_b64}' | base64 -d > docker-compose.yml",
            f"echo '{patch_b64}' | base64 -d > patch_session.py",
            "sudo python3 patch_session.py",
            "sudo docker builder prune -af",
            "sudo docker compose build --no-cache inho_backend",
            "sudo docker compose up -d --force-recreate inho_backend",
            "sudo docker compose ps"
        ]
    }
}

with open("fix_db_migration_req5.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_db_migration_req5.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]
print(f"Command ID: {cmd_id}")

for _ in range(40):
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
            sys.exit(0 if status == 'Success' else 1)

print("Timeout")
sys.exit(1)
