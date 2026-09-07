import boto3, time
ssm = boto3.client('ssm', region_name='us-east-1')
res = ssm.send_command(
    InstanceIds=['i-058e26140671b3254'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [
        "cd $(find /home -name 'orbe-systems' -type d -maxdepth 2 2>/dev/null | head -n 1)",
        "sudo docker-compose up -d --build inho_backend > aws_build.log 2>&1 || sudo docker compose up -d --build inho_backend >> aws_build.log 2>&1",
        "tail -n 100 aws_build.log"
    ]}
)
print("Triggered build on AWS...")
time.sleep(20)
out = ssm.get_command_invocation(CommandId=res['Command']['CommandId'], InstanceId='i-058e26140671b3254')
content = out.get('StandardOutputContent', '') or "NO OUTPUT"
with open('debug_out.txt', 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished writing to debug_out.txt")
