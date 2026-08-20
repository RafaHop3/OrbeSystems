import subprocess, json

ec2_python_script = """
import sys
import os
import asyncio
sys.path.append('/home/ubuntu/orbe-systems/inho_backend')

from db.session import async_session
from models.models import User, UserRole
from core.security import get_password_hash
from sqlalchemy import select

async def seed():
    async with async_session() as session:
        # Check if admin exists
        stmt = select(User).where(User.email == 'admin@inho.com')
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                email='admin@inho.com',
                hashed_password=get_password_hash('admin_pwd_123'),
                full_name='Super Admin INHO',
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            session.add(user)
            print("CREATED new admin@inho.com")
        else:
            user.role = UserRole.ADMIN
            user.hashed_password = get_password_hash('admin_pwd_123')
            print("UPDATED existing admin@inho.com")
            
        await session.commit()
        print("Done.")

if __name__ == '__main__':
    asyncio.run(seed())
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > seed_inho_admin.py\n" + ec2_python_script.replace('$', '\\$') + "\nEOF",
            "sudo docker exec inho_backend python /app/seed_inho_admin.py"
        ]
    }
}

with open("seed_admin_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

output = subprocess.check_output([
    "aws", "ssm", "send-command",
    "--cli-input-json", "file://seed_admin_req.json",
    "--region", "us-east-1",
    "--output", "json"
])
cmd_id = json.loads(output)["Command"]["CommandId"]
print(f"Command ID: {cmd_id}")
