import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "ID=$(docker ps -qf 'name=backend' | head -n 1)",
    "docker logs --tail=100 $ID > /home/ubuntu/OrbeSystems/raw_logs.txt",
    "cat /home/ubuntu/OrbeSystems/raw_logs.txt"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
time.sleep(5)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('raw_docker_log.txt', 'w') as f:
    f.write(output.get('StandardOutputContent', ''))
