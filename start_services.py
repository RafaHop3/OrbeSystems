import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "cd /home/ubuntu/OrbeSystems",
    "docker compose up -d backend",
    "sleep 20",
    "docker compose up -d inho_backend"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']

time.sleep(25)

output = ssm.get_command_invocation(CommandId=command_id, InstanceId=instance_id)
stdout = output.get('StandardOutputContent', '').strip()
stderr = output.get('StandardErrorContent', '').strip()

with open('startup_logs.txt', 'w') as f:
    f.write(stdout + '\n')
    f.write('\n----------ERROR-------\n')
    f.write(stderr + '\n')
