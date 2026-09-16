import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "sudo docker exec orbe_whatsapp sed -i 's/syncFullHistory: false,/syncFullHistory: false, browser: [\"Orbe\", \"Chrome\", \"1.0.0\"],/g' index.js",
    "sudo docker restart orbe_whatsapp",
    "echo 'Bot Identity Patched and Restarted!'"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']
print("Triggered AWS log pull:", command_id)

while True:
    time.sleep(3)
    out = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if not out['CommandInvocations']: continue
    status = out['CommandInvocations'][0]['Status']
    if status in ['Pending', 'InProgress']: continue
    plugin = out['CommandInvocations'][0]['CommandPlugins'][0]
    out_text = plugin.get('Output', 'No output.')
    
    with open("docker_logs_bot.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("LOGS PULLED.")
    break
