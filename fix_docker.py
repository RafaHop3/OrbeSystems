import boto3
import time
import sys

ssm = boto3.client('ssm', region_name='us-east-1')

py_script = """
import yaml

with open('docker-compose.yml', 'r') as f:
    compose = yaml.safe_load(f)

for svc in ['inho_backend']:
    if svc in compose['services']:
        if 'env_file' not in compose['services'][svc]:
             compose['services'][svc]['env_file'] = []
        
        # In yaml if env_file is a string, convert to list
        if isinstance(compose['services'][svc]['env_file'], str):
             compose['services'][svc]['env_file'] = [compose['services'][svc]['env_file']]
             
        if './inho_backend/.env' not in compose['services'][svc]['env_file']:
             compose['services'][svc]['env_file'].append('./inho_backend/.env')
             
        if 'environment' not in compose['services'][svc]:
             compose['services'][svc]['environment'] = []
             
        env_list = compose['services'][svc]['environment']
        if isinstance(env_list, dict):
             env_list['APP_ENV'] = 'production'
        elif isinstance(env_list, list):
             new_envs = [e for e in env_list if not e.startswith('APP_ENV=')]
             new_envs.append('APP_ENV=production')
             compose['services'][svc]['environment'] = new_envs

with open('docker-compose.yml', 'w') as f:
    yaml.dump(compose, f, default_flow_style=False)
"""

commands = [
    "cd /home/ubuntu/orbe-systems",
    "cat << 'EOF' > patch_dc.py\n" + py_script.replace('$', '\\$') + "\nEOF",
    "python3 patch_dc.py",
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
