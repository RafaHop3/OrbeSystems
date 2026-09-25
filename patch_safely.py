import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "cd /home/ubuntu/OrbeSystems",
    "CONTAINER=$(docker ps -qf 'name=backend' -f 'status=running' | head -n 1)",
    "if [ -z \"$CONTAINER\" ]; then",
    "  echo 'Container not found or not running!'",
    "else",
    "  docker exec -u root $CONTAINER sed -i 's/UUID(as_uuid=True)/String/g' /app/models/users/identity.py || echo 'sed failed'",
    "  docker restart $CONTAINER",
    "  echo 'Patch applied and container restarted!'",
    "fi"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']

time.sleep(15)

output = ssm.get_command_invocation(CommandId=command_id, InstanceId=instance_id)
print("Status:", output.get('Status'))
print("STDOUT:", output.get('StandardOutputContent', ''))
print("STDERR:", output.get('StandardErrorContent', ''))
