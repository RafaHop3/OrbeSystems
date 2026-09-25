import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "docker exec orbe_postgres psql -U orbe_admin -d orbesystems -c \"ALTER TABLE users ALTER COLUMN id TYPE VARCHAR USING id::varchar;\""
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)

time.sleep(10)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('alter_output.txt', 'w') as f:
    f.write(output.get('StandardOutputContent', ''))
    f.write(output.get('StandardErrorContent', ''))
