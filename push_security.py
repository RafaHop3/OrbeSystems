import boto3
import time
import sys

ssm = boto3.client('ssm', region_name='us-east-1')

with open(r"d:\OrbeSystems\orbe-systems\inho_backend\main.py", "r", encoding="utf-8") as f:
    main_content = f.read()
    
with open(r"d:\OrbeSystems\orbe-systems\inho_backend\routers\auth.py", "r", encoding="utf-8") as f:
    auth_content = f.read()

commands = [
    "cd /home/ubuntu/orbe-systems/inho_backend",
    "cat << 'EOF' > main.py\n" + main_content.replace('$', '\\$') + "\nEOF",
    "cat << 'EOF' > routers/auth.py\n" + auth_content.replace('$', '\\$') + "\nEOF",
    "sudo docker compose build inho_backend",
    "sudo docker compose up -d --force-recreate inho_backend"
]

print("Sending SSM command...")
response = ssm.send_command(
    InstanceIds=["i-058e26140671b3254"],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": commands}
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
