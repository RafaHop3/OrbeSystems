import subprocess, json, time, sys, base64

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
# Force strip sslmode=require as asyncpg rejects it
if "?" in db_url:
    db_url = db_url.split("?")[0]

engine = create_async_engine(
    db_url,
    **engine_kwargs
)'''
    # We replace the static creation
    vulnerable = '''
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
    **engine_kwargs
)'''
    if vulnerable in content:
        content = content.replace(vulnerable, fix)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print("Successfully patched session.py!")
    else:
        print("WARNING: Vulnerable string not found in session.py. Maybe it already looks different.")
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
            f"echo '{patch_b64}' | base64 -d > patch_session2.py",
            "sudo python3 patch_session2.py",
            "sudo docker compose build --no-cache inho_backend",
            "sudo docker compose up -d --force-recreate inho_backend",
            "sudo docker compose ps"
        ]
    }
}

with open("fix_db_migration_req6.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_db_migration_req6.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]
print(f"Command ID: {cmd_id}")

for _ in range(40):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            print("Status:", status)
            sys.exit(0 if status == 'Success' else 1)

print("Timeout")
sys.exit(1)
