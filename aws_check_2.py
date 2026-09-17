import subprocess
import json
import time

print("Fetching instance ID...")
out = subprocess.check_output(['aws', 'ec2', 'describe-instances', '--no-cli-pager', '--output', 'json']).decode('utf-8', errors='replace')
data = json.loads(out)
instance_id = data['Reservations'][0]['Instances'][0]['InstanceId']
print("Instance ID:", instance_id)

cmd = ["sudo docker ps -a", "free -m", "uptime", "sudo docker logs baileys --tail 50"]
cmd_json = json.dumps(cmd)

print("Sending command...")
send_out = subprocess.check_output(['aws', 'ssm', 'send-command', '--instance-ids', instance_id, '--document-name', 'AWS-RunShellScript', '--parameters', f'commands={cmd_json}', '--output', 'json', '--no-cli-pager']).decode('utf-8', errors='replace')
cmd_id = json.loads(send_out)['Command']['CommandId']
print("Command ID:", cmd_id)

time.sleep(10)
print("Fetching result...")
res = subprocess.check_output(['aws', 'ssm', 'get-command-invocation', '--command-id', cmd_id, '--instance-id', instance_id, '--output', 'json', '--no-cli-pager']).decode('cp1252', errors='replace')
inv = json.loads(res)
print("STATUS:", inv['Status'])
print("--- OUTPUT ---")
print(inv.get('StandardOutputContent', ''))
if inv.get('StandardErrorContent'):
    print("--- ERROR ---")
    print(inv['StandardErrorContent'])
