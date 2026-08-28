import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems && sudo docker compose ps",
            "sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -c \"UPDATE public.users SET role='admin' WHERE email='admin@inho.io';\" || true",
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
            "        result = await session.execute(stmt)",
            "        user = result.scalar_one_or_none()",
            "        pwd = get_password_hash('Admin@INHO2026!')",
            "        if not user:",
            "            user = User(email='admin@inho.io', hashed_password=pwd, full_name='Admin', role=UserRole.ADMIN, is_active=True, is_verified=True)",
            "            session.add(user)",
            "            print('CREATED new admin@inho.io')",
            "        else:",
            "            user.role = UserRole.ADMIN",
            "            user.hashed_password = pwd",
            "            print('UPDATED admin@inho.io')",
            "        await session.commit()",
            "if __name__ == '__main__': asyncio.run(seed())",
            "EOF",
            "sudo docker cp /home/ubuntu/seed_inho.py inho_backend:/app/seed_inho.py",
            "sudo docker exec inho_backend python /app/seed_inho.py"
        ]
    }
}
with open("fix_auth.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_auth.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

for _ in range(25):
    time.sleep(3)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent", ""))
            print("-- ERR --")
            print(data.get("StandardErrorContent", ""))
            sys.exit(0)
print("Timeout")
sys.exit(1)
