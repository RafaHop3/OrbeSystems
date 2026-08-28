import boto3
import time
import sys

ssm = boto3.client('ssm', region_name='us-east-1')
response = ssm.send_command(
    InstanceIds=["i-058e26140671b3254"],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": [
        "cd /home/ubuntu/orbe-systems",
        "echo '=== COMPOSE ==='",
        "cat docker-compose.yml",
        "echo '\\n=== LOGS ==='",
        "sudo docker logs inho_backend --tail 150"
    ]}
)
cmd_id = response['Command']['CommandId']

for _ in range(12):
    time.sleep(5)
    invocation = ssm.get_command_invocation(CommandId=cmd_id, InstanceId="i-058e26140671b3254")
    if invocation['Status'] in ['Success', 'Failed']:
        with open("traceback2.txt", "w", encoding="utf-8") as lf:
            lf.write("OUT:\n" + invocation.get('StandardOutputContent', ''))
            lf.write("\nERR:\n" + invocation.get('StandardErrorContent', ''))
        sys.exit(0)
