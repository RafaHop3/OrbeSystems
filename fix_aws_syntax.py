import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "python3 -c \"import os; p='/home/ubuntu/OrbeSystems/inho_backend/routers/audit.py'; lines=open(p).read().splitlines(); lines[29] = '    query = select(AuditLog).where(cast(AuditLog.user_id, String) == str(current_user.id))'; lines[53] = '        query = query.where(cast(AuditLog.user_id, String) == str(user_id))'; open(p, 'w').write('\\n'.join(lines))\"",
    "cd /home/ubuntu/OrbeSystems",
    "sudo docker-compose -f ec2_compose.yml restart inho_backend",
    "sleep 6",
    "sudo docker logs inho_backend --tail 50",
    "curl -I http://localhost:8001/api/health"
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
    
    with open("fix_syntax_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO fix_syntax_out.txt")
    break
