import subprocess, json, time, sys
payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cat << 'EOF' > /home/ubuntu/seed_inho.py",
            "import sys, os, asyncio",
            "sys.path.append('/app')",
            "from db.session import async_session",
            "from models.models import User, UserRole",
            "from core.security import get_password_hash",
            "from sqlalchemy import select",
            "async def seed():",
            "    async with async_session() as session:",
            "        stmt = select(User).where(User.email == 'admin@inho.io')",
            "        user = (await session.execute(stmt)).scalar_one_or_none()",
            "        pwd = get_password_hash('Admin@INHO2026!')",
            "        if not user:",
            "            user = User(email='admin@inho.io', hashed_password=pwd, full_name='Admin Test', role=UserRole.ADMIN, is_active=True, is_verified=True)",
            "            session.add(user)",
            "        else:",
            "            user.role = UserRole.ADMIN",
            "            user.hashed_password = pwd",
            "        await session.commit()",
            "if __name__ == '__main__': asyncio.run(seed())",
            "EOF",
            "sudo docker cp /home/ubuntu/seed_inho.py inho_backend:/app/seed_inho.py",
            "sudo docker exec inho_backend python /app/seed_inho.py",
            "echo 'SUCCESS SEEDING'"
        ]
    }
}
with open("fix_inho_auth.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_inho_auth.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Wait...")
for _ in range(15):
    time.sleep(4)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent", ""))
            print(data.get("StandardErrorContent", ""))
            sys.exit(0 if data.get("Status") == "Success" else 1)
print("Timeout")
sys.exit(1)
