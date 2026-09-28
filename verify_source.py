import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    # Verify auth.py has the new raw SQL in the container
    "grep 'CAST' /home/ubuntu/OrbeSystems/backend/routes/auth.py",
    # Check inho health endpoint path
    "grep -r '/health' /home/ubuntu/OrbeSystems/inho_backend/main.py | head -5",
    # Check nginx config for inho
    "grep -A5 'inho-api' /etc/nginx/sites-enabled/*.conf 2>/dev/null || cat /etc/nginx/sites-available/*.conf 2>/dev/null | grep -A5 'inho'"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
time.sleep(8)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

print("STDOUT:", output.get('StandardOutputContent', ''))
print("STDERR:", output.get('StandardErrorContent', ''))
