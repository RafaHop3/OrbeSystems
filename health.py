import boto3, time
ssm = boto3.client('ssm', region_name='us-east-1')
res = ssm.send_command(
    InstanceIds=['i-058e26140671b3254'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': ['curl -i -s http://localhost:8001/api/v1/businesses/', 'echo "\\n---DOCKER STATUS---"', 'sudo docker ps -a | grep inho']}
)
time.sleep(10)
out = ssm.get_command_invocation(CommandId=res['Command']['CommandId'], InstanceId='i-058e26140671b3254')
print(out.get('StandardOutputContent', ''))
print(out.get('StandardErrorContent', ''))
