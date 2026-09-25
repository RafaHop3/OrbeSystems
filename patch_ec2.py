import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "cd /home/ubuntu/OrbeSystems/backend/models/users",
    "sed -i 's/UUID(as_uuid=True)/String/g' identity.py",
    "cd /home/ubuntu/OrbeSystems",
    "docker compose build backend",
    "docker compose up -d backend"
]

print("Applying Python Patch & Rebuilding Backend Container on EC2...")
response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']

time.sleep(40)

output = ssm.get_command_invocation(CommandId=command_id, InstanceId=instance_id)

with open('patch_logs.txt', 'w') as f:
    f.write(output.get('StandardOutputContent', '').strip() + '\n')
    f.write('\n----------ERROR-------\n')
    f.write(output.get('StandardErrorContent', '').strip() + '\n')
