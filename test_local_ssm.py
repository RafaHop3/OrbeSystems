import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "curl -i -X OPTIONS http://localhost:8001/api/v1/auth/login -H 'Origin: https://inho.orbesystems.com.br' -H 'Access-Control-Request-Method: POST'",
    "curl -i -X POST http://localhost:8001/api/v1/auth/login"
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
    out_text = plugin.get('Output', 'No output format identified.')
    with open("local_test_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO local_test_out.txt")
    break
