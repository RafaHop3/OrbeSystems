import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "CONTAINER=$(docker ps -qf 'name=backend' -f 'status=running' | head -n 1)",
    "FILEPATH=$(docker exec -u root $CONTAINER find / -name identity.py 2>/dev/null | grep models/users | head -n 1)",
    "docker exec -u root $CONTAINER cat $FILEPATH | grep 'id = Column'"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)

time.sleep(10)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('identity_check.txt', 'w') as f:
    f.write(output.get('StandardOutputContent', ''))
