import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

# Query the local postgres container directly
commands = [
    "docker exec orbe_postgres psql -U orbe_admin -d orbesystems -c \"SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;\""
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
time.sleep(8)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

print(output.get('StandardOutputContent', ''))
print(output.get('StandardErrorContent', ''))
