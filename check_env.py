import boto3
import time
import sys

ssm = boto3.client('ssm', region_name='us-east-1')
commands = [
    "cd /home/ubuntu/orbe-systems/inho_backend",
    "cat .env",
    "/usr/bin/python3 -c 'from core.config import settings; print(\"APP_ENV is\", settings.APP_ENV)'"
]
response = ssm.send_command(
    InstanceIds=["i-058e26140671b3254"],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": commands}
)
cmd_id = response['Command']['CommandId']

for _ in range(12):
    time.sleep(5)
    invocation = ssm.get_command_invocation(CommandId=cmd_id, InstanceId="i-058e26140671b3254")
    if invocation['Status'] in ['Success', 'Failed']:
        print("OUT:\n", invocation.get('StandardOutputContent'))
        print("ERR:\n", invocation.get('StandardErrorContent'))
        sys.exit(0)
