import boto3, time
ssm = boto3.client('ssm', region_name='us-east-1')
cmds = [
    "sudo docker ps -a"
]
res = ssm.send_command(
    InstanceIds=['i-058e26140671b3254'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': cmds}
)
time.sleep(10)
out = ssm.get_command_invocation(CommandId=res['Command']['CommandId'], InstanceId='i-058e26140671b3254')
with open('debug_docker.txt', 'w', encoding='utf-8') as f:
    f.write(out.get('StandardOutputContent', 'NO OUT'))
