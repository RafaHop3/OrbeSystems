import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "echo 'Deploying Updated Orbe Backend from ECR...'",
    "cd /home/ubuntu/orbe-systems",
    "git stash",
    "git fetch origin main",
    "git reset --hard origin/main",
    "docker rm -f orbe_backend || true",
    "docker-compose -f ec2_compose.yml stop backend",
    "docker-compose -f ec2_compose.yml rm -f backend",
    "docker-compose -f ec2_compose.yml up -d --no-deps --force-recreate backend",
    "echo 'Orbe Backend build and restart complete.'"
]

print(f"Sending command to {instance_id} via SSM...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': commands}
)

command_id = response['Command']['CommandId']
print(f"Command ID: {command_id}")

while True:
    time.sleep(3)
    out = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if not out['CommandInvocations']:
        continue
    status = out['CommandInvocations'][0]['Status']
    print(f"Status: {status}")
    if status in ['Pending', 'InProgress']:
        continue
    
    plugin = out['CommandInvocations'][0]['CommandPlugins'][0]
    out_text = plugin.get('Output', 'No output format identified.')
    with open('ssm_orbe_out.txt', 'w', encoding='utf-8') as f:
        f.write(out_text)
    print("Saved output to ssm_orbe_out.txt")
    break

print("Deploy concluded.")
