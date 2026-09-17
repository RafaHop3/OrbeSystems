import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "sudo -u ubuntu sh -c 'cd /home/ubuntu/OrbeSystems && git add . && git stash && git fetch --all && git reset --hard origin/main'",
    "cd /home/ubuntu/OrbeSystems",
    "sudo docker compose down",
    "sudo docker compose up -d --build"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']

print(f"Triggered command {command_id}. Waiting for completion...")

while True:
    time.sleep(5)
    out = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if not out['CommandInvocations']: continue
    status = out['CommandInvocations'][0]['Status']
    if status in ['Pending', 'InProgress']: continue
    plugin = out['CommandInvocations'][0]['CommandPlugins'][0]
    out_text = plugin.get('Output', 'No output.')
    
    with open("rebuild_all_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO rebuild_all_out.txt. Status:", status)
    break
