import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "sudo docker logs inho_backend > /home/ubuntu/err2.log 2>&1",
    "python3 -c \"import sys; lines = open('/home/ubuntu/err2.log').read().splitlines(); idx = [i for i, line in enumerate(lines) if 'write_audit' in line]; print('\\n'.join(lines[idx[-1]-10 : idx[-1]+25])) if idx else print('No trace')\""
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']

while True:
    time.sleep(3)
    out = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if not out['CommandInvocations']: continue
    status = out['CommandInvocations'][0]['Status']
    if status in ['Pending', 'InProgress']: continue
    plugin = out['CommandInvocations'][0]['CommandPlugins'][0]
    out_text = plugin.get('Output', 'No output.')
    
    with open("err2_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO err2_out.txt")
    break
