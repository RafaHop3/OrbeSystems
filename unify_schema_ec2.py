import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"
commands = [
    "cd /home/ubuntu/OrbeSystems",
    "sed -i 's/- SCHEMA=inho/- SCHEMA=public/g' ec2_compose.yml",
    "if ! grep -q 'APP_ENV=production' ec2_compose.yml; then sed -i '/- SCHEMA=public/a \\    - APP_ENV=production' ec2_compose.yml; fi",
    "docker-compose -f ec2_compose.yml up -d --force-recreate inho_backend"
]

print("Bridging production schema onto AWS...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': commands}
)

command_id = response['Command']['CommandId']
while True:
    time.sleep(2)
    out = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if not out['CommandInvocations']: continue
    status = out['CommandInvocations'][0]['Status']
    if status in ['Pending', 'InProgress']: continue
    
    print(out['CommandInvocations'][0]['CommandPlugins'][0].get('Output', ''))
    break
