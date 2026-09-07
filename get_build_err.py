import boto3, time
ssm = boto3.client('ssm', region_name='us-east-1')
cmds = [
    "cd $(find /home -name 'orbe-systems' -type d -maxdepth 2 2>/dev/null | head -n 1)",
    "sudo docker-compose build inho_backend > build_err.log 2>&1 || sudo docker compose build inho_backend > build_err.log 2>&1",
    "cat build_err.log"
]
res = ssm.send_command(
    InstanceIds=['i-058e26140671b3254'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': cmds}
)
time.sleep(15)
out = ssm.get_command_invocation(CommandId=res['Command']['CommandId'], InstanceId='i-058e26140671b3254')
with open('aws_err.log', 'w', encoding='utf-8') as f:
    f.write(out.get('StandardOutputContent', ''))
