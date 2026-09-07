import boto3, time
ssm = boto3.client('ssm', region_name='us-east-1')
res = ssm.send_command(
    InstanceIds=['i-058e26140671b3254'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': ['sudo docker ps -a']}
)
time.sleep(10)
out = ssm.get_command_invocation(CommandId=res['Command']['CommandId'], InstanceId='i-058e26140671b3254')
print(out.get('StandardOutputContent', 'NO_OUT'))
