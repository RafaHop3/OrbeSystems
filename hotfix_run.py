import boto3, time
ssm = boto3.client('ssm', region_name='us-east-1')
cmds = [
    "cd $(find /home -name 'orbe-systems' -type d -maxdepth 2 2>/dev/null | head -n 1)",
    "sudo sed -i 's/python -m alembic upgrade head && //g' inho_backend/Dockerfile",
    "sudo docker-compose up -d --build inho_backend"
]
res = ssm.send_command(
    InstanceIds=['i-058e26140671b3254'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': cmds}
)
time.sleep(20)
out = ssm.get_command_invocation(CommandId=res['Command']['CommandId'], InstanceId='i-058e26140671b3254')
with open('debug_hotfix.txt', 'w', encoding='utf-8') as f:
    f.write(out.get('StandardOutputContent', 'NO OUT'))
    f.write("\n--ERR--\n")
    f.write(out.get('StandardErrorContent', 'NO ERR'))
