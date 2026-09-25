import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "cd /home/ubuntu/OrbeSystems",
    "docker compose logs --tail=100 backend"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']

time.sleep(20)

output = ssm.get_command_invocation(CommandId=command_id, InstanceId=instance_id)

with open('fastapi_logs.txt', 'w') as f:
    f.write(output.get('StandardOutputContent', '').strip() + '\n')
    f.write('\n----------ERROR-------\n')
    f.write(output.get('StandardErrorContent', '').strip() + '\n')
