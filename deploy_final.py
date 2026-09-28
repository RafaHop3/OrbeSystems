import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "cd /home/ubuntu/OrbeSystems",
    "git pull origin main",
    "docker compose restart backend inho_backend",
    "sleep 5",
    "docker ps --format 'table {{.Names}}\\t{{.Status}}'"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)

time.sleep(20)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

print(output.get('StandardOutputContent', ''))
print(output.get('StandardErrorContent', ''))
