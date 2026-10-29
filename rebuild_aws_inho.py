import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

# IMPORTANTE: NUNCA rodar `docker-compose build` direto na EC2 t2/t3.micro (1GB RAM),
# pois o build consome 100% da RAM e trava o host por OOM.
# Usamos git reset + docker cp + docker restart (zero overhead de memória, < 5s).
commands = [
    "sudo -u ubuntu sh -c 'cd /home/ubuntu/OrbeSystems && git fetch origin main && git reset --hard origin/main'",
    "cd /home/ubuntu/OrbeSystems",
    "sudo docker start orbe_backend inho_backend orbe_whatsapp || sudo docker-compose -f ec2_compose.yml up -d",
    "sudo docker cp inho_backend/. inho_backend:/app/",
    "sudo docker restart orbe_backend inho_backend",
    "sleep 15",
    "curl -s http://localhost:8000/health && echo '' && curl -s http://localhost:8001/health"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']

while True:
    time.sleep(2)
    out = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if not out['CommandInvocations']: continue
    status = out['CommandInvocations'][0]['Status']
    if status in ['Pending', 'InProgress']: continue
    plugin = out['CommandInvocations'][0]['CommandPlugins'][0]
    out_text = plugin.get('Output', 'No output.')
    
    with open("rebuild_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("STATUS:", status)
    print(out_text)
    break
