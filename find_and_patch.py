import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "CONTAINER=$(docker ps -qf 'name=backend' -f 'status=running' | head -n 1)",
    "if [ -z \"$CONTAINER\" ]; then",
    "  echo 'Container not found!'",
    "else",
    "  FILEPATH=$(docker exec -u root $CONTAINER find / -name identity.py 2>/dev/null | grep models/users | head -n 1)",
    "  echo 'Found file at:' $FILEPATH",
    "  docker exec -u root $CONTAINER sed -i 's/UUID(as_uuid=True)/String/g' $FILEPATH",
    "  docker restart $CONTAINER",
    "  echo 'Patched and restarted!'",
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
