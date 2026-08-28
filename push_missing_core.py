import boto3
import time
import sys

ssm = boto3.client('ssm', region_name='us-east-1')

with open(r"d:\OrbeSystems\orbe-systems\inho_backend\core\token_blacklist.py", "r", encoding="utf-8") as f:
    tbl_content = f.read()

with open(r"d:\OrbeSystems\orbe-systems\inho_backend\core\mfa_limiter.py", "r", encoding="utf-8") as f:
    mfa_content = f.read()
    
commands = [
    "cd /home/ubuntu/orbe-systems/inho_backend",
    "cat << 'EOF' > core/token_blacklist.py\n" + tbl_content.replace('$', '\\$') + "\nEOF",
    "cat << 'EOF' > core/mfa_limiter.py\n" + mfa_content.replace('$', '\\$') + "\nEOF",
    "sudo docker compose restart inho_backend"
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
