import subprocess
import json
import time

out = subprocess.check_output(['aws', 'ec2', 'describe-instances', '--no-cli-pager', '--output', 'json']).decode('utf-8', errors='replace')
data = json.loads(out)
instance_id = data['Reservations'][0]['Instances'][0]['InstanceId']

cmd = [
    "sudo docker inspect inho_backend --format='Health: {{.State.Health.Status}} | OOM: {{.State.OOMKilled}}' > /tmp/inho.txt",
    "echo '--LAST HEALTH LOGS--' >> /tmp/inho.txt",
    "sudo docker inspect inho_backend --format='{{range .State.Health.Log}}{{.Start}} EXIT={{.ExitCode}} {{.Output}}{{end}}' >> /tmp/inho.txt",
    "echo '--CONTAINER LOGS--' >> /tmp/inho.txt",
    "sudo docker logs inho_backend --tail 60 >> /tmp/inho.txt 2>&1",
    "cat /tmp/inho.txt"
]
cmd_json = json.dumps(cmd)

send_out = subprocess.check_output([
    'aws', 'ssm', 'send-command',
    '--instance-ids', instance_id,
    '--document-name', 'AWS-RunShellScript',
    '--parameters', f'commands={cmd_json}',
    '--output', 'json', '--no-cli-pager'
]).decode('utf-8', errors='replace')

cmd_id = json.loads(send_out)['Command']['CommandId']
time.sleep(12)

res = subprocess.check_output([
    'aws', 'ssm', 'get-command-invocation',
    '--command-id', cmd_id,
    '--instance-id', instance_id,
    '--output', 'json', '--no-cli-pager'
]).decode('utf-8', errors='replace')

inv = json.loads(res)
with open('inho_diag_report.txt', 'w', encoding='utf-8') as f:
    f.write(inv.get('StandardOutputContent', ''))
    f.write('\n---STDERR---\n')
    f.write(inv.get('StandardErrorContent', ''))
