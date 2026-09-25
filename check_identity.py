import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "cat /home/ubuntu/OrbeSystems/backend/models/users/identity.py | grep 'id = Column'"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)

time.sleep(5)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('identity_line.txt', 'w') as f:
    f.write(output.get('StandardOutputContent', ''))
