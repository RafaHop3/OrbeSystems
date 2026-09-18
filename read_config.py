import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

shell_code = """
import sys
sys.path.append("/app")
try:
    from core.config import settings
    print(f"CONF_URL={settings.DATABASE_URL}")
except Exception as e:
    print("ERROR:", e)
"""

commands = [
    f"cat << 'EOF' > /home/ubuntu/read_config.py\n{shell_code}\nEOF",
    "sudo docker cp /home/ubuntu/read_config.py inho_backend:/app/read_config.py",
    "sudo docker exec inho_backend python /app/read_config.py"
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
    print("SSM OUTPUT:")
    print(out_text)
    break
