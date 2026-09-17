import subprocess
import json
import time

out = subprocess.check_output(['aws', 'ec2', 'describe-instances', '--no-cli-pager', '--output', 'json']).decode('utf-8', errors='replace')
data = json.loads(out)
instance_id = data['Reservations'][0]['Instances'][0]['InstanceId']

cmd = [
    "sudo docker inspect orbe_whatsapp --format='{{.State.OOMKilled}}' > /tmp/report.txt",
    "echo --WHATSAPP LOGS-- >> /tmp/report.txt",
    "sudo docker logs orbe_whatsapp --tail 50 >> /tmp/report.txt 2>&1",
    "cat /tmp/report.txt"
]
cmd_json = json.dumps(cmd)

send_out = subprocess.check_output(['aws', 'ssm', 'send-command', '--instance-ids', instance_id, '--document-name', 'AWS-RunShellScript', '--parameters', f'commands={cmd_json}', '--output', 'json', '--no-cli-pager']).decode('utf-8', errors='replace')
cmd_id = json.loads(send_out)['Command']['CommandId']

time.sleep(10)
res = subprocess.check_output(['aws', 'ssm', 'get-command-invocation', '--command-id', cmd_id, '--instance-id', instance_id, '--output', 'json', '--no-cli-pager']).decode('utf-8', errors='replace')
inv = json.loads(res)

with open('aws_docker_report2.txt', 'w', encoding='utf-8') as f:
    f.write(inv.get('StandardOutputContent', ''))
