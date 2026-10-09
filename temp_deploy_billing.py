import boto3
import time
import base64

def run():
    ssm = boto3.client('ssm', region_name='us-east-1')
    
    with open('d:/OrbeSystems/orbe-systems/inho_backend/routers/billing.py', 'rb') as f:
        content_b64 = base64.b64encode(f.read()).decode('utf-8')

    res = ssm.send_command(
        InstanceIds=['i-058e26140671b3254'],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [
            f"echo '{content_b64}' | base64 -d > /tmp/billing.py",
            "sudo docker cp /tmp/billing.py inho_backend:/app/routers/billing.py",
            "sudo docker restart inho_backend"
        ]}
    )
    cid = res['Command']['CommandId']
    while True:
        time.sleep(2)
        out = ssm.list_command_invocations(CommandId=cid, Details=True)
        if out['CommandInvocations']:
            status = out['CommandInvocations'][0]['Status']
            if status not in ['Pending', 'InProgress']:
                print("--- FINAL OUTPUT ---")
                print(out['CommandInvocations'][0]['CommandPlugins'][0].get('Output', '').strip())
                break

run()
