import boto3, time
ssm = boto3.client('ssm', region_name='us-east-1')
cmds = [
    "cd $(find /home -name 'orbe-systems' -type d -maxdepth 2 2>/dev/null | head -n 1)",
    "sudo git fetch --all",
    "sudo git reset --hard origin/main",
    "sudo docker-compose up -d --build inho_backend 2>/dev/null || sudo docker compose up -d --build inho_backend 2>/dev/null"
]
print("Sending SSM deployment command...")
res = ssm.send_command(
    InstanceIds=['i-058e26140671b3254'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': cmds}
)
time.sleep(15)
out = ssm.get_command_invocation(CommandId=res['Command']['CommandId'], InstanceId='i-058e26140671b3254')
print("Deploy Status:", out.get('Status'))
print("Deploy OUT:", out.get('StandardOutputContent', '')[-500:])
print("Deploy ERR:", out.get('StandardErrorContent', '')[-500:])
