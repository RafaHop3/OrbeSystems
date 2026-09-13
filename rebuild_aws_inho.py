import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "sudo -u ubuntu sh -c 'cd /home/ubuntu/OrbeSystems && git fetch origin main && git reset --hard origin/main'",
    "cd /home/ubuntu/OrbeSystems",
    "sudo docker-compose -f ec2_compose.yml build inho_backend",
    "sudo docker-compose -f ec2_compose.yml up -d --force-recreate inho_backend",
    "sleep 3",
    "curl -I http://localhost:8001/api/health"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']

while True:
    time.sleep(3)
    out = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if not out['CommandInvocations']: continue
    status = out['CommandInvocations'][0]['Status']
    if status in ['Pending', 'InProgress']: continue
    plugin = out['CommandInvocations'][0]['CommandPlugins'][0]
    out_text = plugin.get('Output', 'No output.')
    
    with open("rebuild_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO rebuild_out.txt")
    break
