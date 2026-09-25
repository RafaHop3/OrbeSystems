import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "docker ps -a",
    "sudo systemctl status nginx --no-pager -l || true",
    "cd /home/ubuntu/OrbeSystems",
    "docker compose logs --tail=50 backend || true"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']

time.sleep(10)

output = ssm.get_command_invocation(CommandId=command_id, InstanceId=instance_id)
stdout = output.get('StandardOutputContent', '').strip()
stderr = output.get('StandardErrorContent', '').strip()

with open('ec2_status.txt', 'w') as f:
    f.write(stdout + '\n')
    f.write('\n----------ERROR-------\n')
    f.write(stderr + '\n')
