import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "cat /var/log/nginx/access.log | grep '/api/auth/login' | tail -n 20",
    "cat /var/log/nginx/error.log | tail -n 20"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
time.sleep(5)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('nginx_logs.txt', 'w') as f:
    f.write(output.get('StandardOutputContent', ''))
    f.write(output.get('StandardErrorContent', ''))
