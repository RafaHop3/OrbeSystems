import subprocess
import sys

try:
    import boto3
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "boto3"])
    import boto3

import time

ssm = boto3.client('ssm', region_name='us-east-1')
script = """
import os

# 1. Patch config.py CORS origins
filepath = '/home/ubuntu/orbe-systems/inho_backend/core/config.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = '"http://localhost:3001",'
replacement = '"http://localhost:3001",\\n        "https://inho.orbesystems.com.br"'
if "inho.orbesystems.com.br" not in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 2. Patch .env to set APP_ENV=production for secure Cookie Domain
env_path = '/home/ubuntu/orbe-systems/inho_backend/.env'
try:
    with open(env_path, 'r', encoding='utf-8') as f:
        env_content = f.read()
except FileNotFoundError:
    env_content = ""

if "APP_ENV=production" not in env_content:
    with open(env_path, 'a', encoding='utf-8') as f:
        f.write('\\nAPP_ENV=production\\n')
"""

commands = [
    f"cd /home/ubuntu/orbe-systems",
    "cat << 'EOF' > patch_cors.py\n" + script.replace('$', '\\$') + "\nEOF",
    "python3 patch_cors.py",
    "sudo docker compose build inho_backend",
    "sudo docker compose up -d --no-deps inho_backend"
]

print("Sending SSM command...")
response = ssm.send_command(
    InstanceIds=["i-058e26140671b3254"],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": commands}
)
cmd_id = response['Command']['CommandId']

for _ in range(30):
    time.sleep(5)
    invocation = ssm.get_command_invocation(
        CommandId=cmd_id,
        InstanceId="i-058e26140671b3254"
    )
    status = invocation['Status']
    if status in ['Success', 'Failed']:
        print(f"Status: {status}")
        print("Output:\n", invocation.get('StandardOutputContent'))
        print("Errors:\n", invocation.get('StandardErrorContent'))
        sys.exit(0 if status == 'Success' else 1)
print("Timeout!")
sys.exit(1)
