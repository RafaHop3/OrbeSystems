import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': ["docker logs --tail 200 inho_backend"]}
)

command_id = response['Command']['CommandId']
while True:
    time.sleep(2)
    out = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if not out['CommandInvocations']: continue
    status = out['CommandInvocations'][0]['Status']
    if status in ['Pending', 'InProgress']: continue
    
    out_text = out['CommandInvocations'][0]['CommandPlugins'][0].get('Output', '')
    with open('inho_raw_logs.txt', 'w', encoding='utf-8') as f:
        f.write(out_text)
    print("Logs saved to inho_raw_logs.txt successfully.")
    break
