import boto3
import time
import sys

ssm = boto3.client('ssm', region_name='us-east-1')

py_script = """
import yaml

with open('docker-compose.yml', 'r') as f:
    compose = yaml.safe_load(f)

supa_url_sync = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"
supa_url_async = "postgresql+asyncpg://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

for svc in ['backend', 'inho_backend']:
    if svc in compose['services']:
        if 'environment' not in compose['services'][svc]:
             compose['services'][svc]['environment'] = []
             
        envs = compose['services'][svc].get('environment', [])
        # handle list format
        if isinstance(envs, list):
            new_envs = [e for e in envs if not e.startswith('DATABASE_URL=')]
            new_url = supa_url_async if svc == 'inho_backend' else supa_url_sync
            new_envs.append(f"DATABASE_URL={new_url}")
            compose['services'][svc]['environment'] = new_envs
        # handle dict format
        elif isinstance(envs, dict):
            new_url = supa_url_async if svc == 'inho_backend' else supa_url_sync
            envs['DATABASE_URL'] = new_url

with open('docker-compose.yml', 'w') as f:
    yaml.dump(compose, f, default_flow_style=False)
"""

commands = [
    "cd /home/ubuntu/orbe-systems",
    "cat << 'EOF' > patch_pooler_3.py\n" + py_script.replace('$', '\\$') + "\nEOF",
    "python3 patch_pooler_3.py",
    "sudo docker compose up -d"
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
