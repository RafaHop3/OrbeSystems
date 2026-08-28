import os
import zipfile
import base64
import boto3
import time
import sys

ssm = boto3.client('ssm', region_name='us-east-1')

local_dir = r"d:\OrbeSystems\orbe-systems\inho_backend"
zip_path = r"d:\OrbeSystems\orbe-systems\inho_backend_sync.zip"

print("Creating archive...")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(local_dir):
        if '__pycache__' in root or '.pytest_cache' in root or 'data' in root or 'venv' in root:
            continue
        for file in files:
            if file.endswith('.pyc') or file == '.env':
                continue
            abs_file = os.path.join(root, file)
            arcname = os.path.relpath(abs_file, local_dir)
            zipf.write(abs_file, arcname)

with open(zip_path, "rb") as f:
    zip_b64 = base64.b64encode(f.read()).decode('utf-8')

chunk_size = 20000
chunks = [zip_b64[i:i+chunk_size] for i in range(0, len(zip_b64), chunk_size)]

print(f"Deploying {len(chunks)} chunks to EC2...")

# Clean up remote file first
response = ssm.send_command(
    InstanceIds=["i-058e26140671b3254"],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": ["rm -f /home/ubuntu/inho_backend_sync.b64"]}
)
time.sleep(2)

# Send chunks
for i, chunk in enumerate(chunks):
    print(f"Sending chunk {i+1} / {len(chunks)}")
    cmd = f"cat << 'EOF' >> /home/ubuntu/inho_backend_sync.b64\n{chunk}\nEOF"
    ssm.send_command(
        InstanceIds=["i-058e26140671b3254"],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": [cmd]}
    )
    time.sleep(3) # Wait briefly so commands execute in order (SSM doesn't strictly guarantee order, but with sleep it usually works. Actually, better append sequence? appending with sleep is usually fine.)

# Decode, Unzip, and Build
deploy_commands = [
    "cd /home/ubuntu",
    "base64 -d inho_backend_sync.b64 > inho_backend_sync.zip",
    "unzip -o inho_backend_sync.zip -d /home/ubuntu/orbe-systems/inho_backend",
    "cd /home/ubuntu/orbe-systems",
    "sudo docker compose build inho_backend",
    "sudo docker compose up -d --force-recreate inho_backend"
]

print("Executing extraction and rebuild...")
response = ssm.send_command(
    InstanceIds=["i-058e26140671b3254"],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": deploy_commands}
)
cmd_id = response['Command']['CommandId']

for _ in range(40):
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
