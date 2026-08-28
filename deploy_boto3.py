import boto3
import time
import sys

def run():
    ssm = boto3.client('ssm', region_name='us-east-1')
    commands = [
        "cd /home/ubuntu/orbe-systems",
        "git pull origin main",
        "sudo docker compose build inho_backend",
        "sudo docker compose up -d --no-deps inho_backend"
    ]
    print("Sending SSM command...")
    response = ssm.send_command(
        InstanceIds=["i-058e26140671b3254"],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": commands}
    )
    cmd_id = response['Command']['CommandId']
    
    for _ in range(60):
        time.sleep(5)
        invocation = ssm.get_command_invocation(
            CommandId=cmd_id,
            InstanceId="i-058e26140671b3254"
        )
        status = invocation['Status']
        if status in ['Success', 'Failed']:
            print(f"Status: {status}")
            print("Output:\n", invocation.get('StandardOutputContent'))
            print("Errors:\n", invocation.get('StandardErrorContent'))
            sys.exit(0 if status == 'Success' else 1)
    print("Timeout!")
    sys.exit(1)

if __name__ == '__main__':
    run()
