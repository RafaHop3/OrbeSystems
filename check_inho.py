import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'",
    "docker logs --tail=60 inho_backend"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
time.sleep(8)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('inho_status.txt', 'w', encoding='utf-8') as f:
    f.write(output.get('StandardOutputContent', ''))
    f.write('\n---STDERR---\n')
    f.write(output.get('StandardErrorContent', ''))
