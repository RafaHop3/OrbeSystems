import boto3, time, sys

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "cd /home/ubuntu/OrbeSystems",
    "docker ps -a",
    "docker compose logs --tail=50 backend"
]

print("Sending SSM command...")
response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']
print("Command ID:", command_id)

for attempt in range(12):
    time.sleep(10)
    output = ssm.get_command_invocation(CommandId=command_id, InstanceId=instance_id)
    status = output.get('Status')
    print(f"Poll {attempt+1}: {status}")
    if status in ['Success', 'Failed', 'Cancelled', 'TimedOut']:
        out = output.get('StandardOutputContent', '')
        err = output.get('StandardErrorContent', '')
        with open('final_status.txt', 'w', encoding='utf-8') as f:
            f.write("--- STDOUT ---\n" + out + "\n--- STDERR ---\n" + err)
        print("Logs saved to final_status.txt")
        sys.exit(0)
