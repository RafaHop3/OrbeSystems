import boto3, time
ssm = boto3.client('ssm', region_name='us-east-1')
cmds = [
    "cd $(find /home -name 'orbe-systems' -type d -maxdepth 2 2>/dev/null | head -n 1)",
    "sudo rm -rf inho_frontend/node_modules inho_frontend/.next frontend/node_modules frontend/.next /home/ubuntu/.npm /root/.npm /home/ubuntu/.cache /root/.cache",
    "sudo docker system prune -af --volumes",
    "df -h /",
    "sudo docker-compose up -d --build inho_backend 2>/dev/null || sudo docker compose up -d --build inho_backend 2>/dev/null"
]
res = ssm.send_command(
    InstanceIds=['i-058e26140671b3254'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': cmds}
)
print("Cleaning out node caches, pruning volumes and restarting docker build...")
time.sleep(20)
out = ssm.get_command_invocation(CommandId=res['Command']['CommandId'], InstanceId='i-058e26140671b3254')
print(out.get('StandardOutputContent', ''))
print(out.get('StandardErrorContent', ''))
