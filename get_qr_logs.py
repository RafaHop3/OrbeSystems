import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

# restart to ensure fresh QR, wait, and grab logs
commands = [
    "sudo docker restart orbe_whatsapp",
    "sleep 10",
    "sudo docker logs orbe_whatsapp --tail 100"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']
print(f"Triggered QR fetch: {command_id}")

time.sleep(15)
output = ssm.get_command_invocation(CommandId=command_id, InstanceId=instance_id)
stdout = output.get('StandardOutputContent', '')
stderr = output.get('StandardErrorContent', '')

with open('qr_logs.txt', 'w', encoding='utf-8') as f:
    f.write(stdout + "\n================STDERR================\n" + stderr)
print("Saved QR logs to qr_logs.txt")
