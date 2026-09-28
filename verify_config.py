import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    # Full nginx config for inho-api
    "cat /etc/nginx/sites-available/inho-api.orbesystems.com.br.conf 2>/dev/null | head -40",
    # Verify auth.py has CAST
    "grep -c 'CAST' /home/ubuntu/OrbeSystems/backend/routes/auth.py",
    # Check inho main.py routes  
    "grep -n 'health\\|prefix' /home/ubuntu/OrbeSystems/inho_backend/main.py | head -20"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
time.sleep(8)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('verify_config.txt', 'w', encoding='utf-8') as f:
    f.write(output.get('StandardOutputContent', ''))
    f.write('\n---STDERR---\n')
    f.write(output.get('StandardErrorContent', ''))
