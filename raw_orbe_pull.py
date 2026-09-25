import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "docker logs --tail=40 orbe_backend > /home/ubuntu/OrbeSystems/orbe_logs.txt",
    "cat /home/ubuntu/OrbeSystems/orbe_logs.txt"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
time.sleep(5)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('orbe_docker_log.txt', 'w') as f:
    f.write(output.get('StandardOutputContent', ''))
