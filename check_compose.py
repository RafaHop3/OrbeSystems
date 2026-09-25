import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': ["cat /home/ubuntu/OrbeSystems/docker-compose.yml"]}
)
time.sleep(5)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('aws_compose.yml', 'w') as f:
    f.write(output.get('StandardOutputContent', ''))
