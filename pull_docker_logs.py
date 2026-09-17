import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "sudo docker stop orbe_whatsapp",
    "sudo docker cp /home/ubuntu/orbe-repo/whatsapp_bot/index.js orbe_whatsapp:/app/index.js",
    "sudo docker start orbe_whatsapp",
    "sleep 8 && sudo docker exec orbe_whatsapp grep -n 'sentMsg' /app/index.js | head -10"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']
print(f"Triggered AWS log pull\n\n\n\n\n\n\n\n                     {command_id}")

time.sleep(15)

output = ssm.get_command_invocation(CommandId=command_id, InstanceId=instance_id)
stdout = output.get('StandardOutputContent', '').strip()
stderr = output.get('StandardErrorContent', '').strip()

with open('docker_logs_bot.txt', 'w') as f:
    if stdout:
        f.write(stdout + '\n')
    if stderr:
        f.write('\n----------ERROR-------\n')
        f.write(stderr + '\n')

print("\nLOGS PULLED.")
