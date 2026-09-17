import subprocess
import json
import time

out = subprocess.check_output(['aws', 'ec2', 'describe-instances', '--no-cli-pager', '--output', 'json']).decode('utf-8', errors='replace')
data = json.loads(out)
instance_id = data['Reservations'][0]['Instances'][0]['InstanceId']

cmd = [
    "cd /home/ubuntu/OrbeSystems && sudo git fetch --all && sudo git reset --hard origin/main && sudo docker compose up -d --build whatsapp_bot",
    "cd /home/ubuntu/orbe-repo && sudo git fetch --all && sudo git reset --hard origin/main && sudo docker compose up -d --build whatsapp_bot || true",
    "sudo docker ps > /tmp/report9.txt",
    "cat /tmp/report9.txt"
]
cmd_json = json.dumps(cmd)

send_out = subprocess.check_output(['aws', 'ssm', 'send-command', '--instance-ids', instance_id, '--document-name', 'AWS-RunShellScript', '--parameters', f'commands={cmd_json}', '--output', 'json', '--no-cli-pager']).decode('utf-8', errors='replace')
cmd_id = json.loads(send_out)['Command']['CommandId']

time.sleep(35) # Ensure docker build has time
res = subprocess.check_output(['aws', 'ssm', 'get-command-invocation', '--command-id', cmd_id, '--instance-id', instance_id, '--output', 'json', '--no-cli-pager']).decode('utf-8', errors='replace')
inv = json.loads(res)

with open('aws_docker_report9.txt', 'w', encoding='utf-8') as f:
    f.write(inv.get('StandardOutputContent', ''))
    f.write('\n---ERROR---\n')
    f.write(inv.get('StandardErrorContent', ''))
