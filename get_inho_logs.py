import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "docker logs --tail 100 inho_backend"
]

print(f"Dumping inho_backend logs from EC2...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': commands}
)

command_id = response['Command']['CommandId']

while True:
    time.sleep(2)
    out = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if not out['CommandInvocations']:
        continue
    status = out['CommandInvocations'][0]['Status']
    if status in ['Pending', 'InProgress']:
        continue
    
    plugin = out['CommandInvocations'][0]['CommandPlugins'][0]
    out_text = plugin.get('Output', '')
    print(out_text)
    break
