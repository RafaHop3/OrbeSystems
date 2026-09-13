import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "sudo sed -i 's/return 301 https:\\/\\/\\$host\\$request_uri;/# return 301/g' /etc/nginx/sites-available/*",
    "sudo systemctl restart nginx",
    "cd /home/ubuntu/OrbeSystems && sudo docker-compose -f ec2_compose.yml up -d backend"
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
    
    with open("patch_nginx_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO patch_nginx_out.txt")
    break
