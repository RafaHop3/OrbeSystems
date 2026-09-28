import boto3
import time
import sys

def fetch_logs():
    ssm = boto3.client('ssm', region_name='us-east-1')
    instance_id = "i-058e26140671b3254"
    commands = [
        "cd /home/ubuntu/OrbeSystems",
        "docker compose logs --tail=150 backend > /tmp/backend_logs.txt",
        "docker compose logs --tail=150 inho_backend > /tmp/inho_logs.txt",
        "cat /tmp/backend_logs.txt",
        "echo '=== SPLIT ==='",
        "cat /tmp/inho_logs.txt"
    ]
    
    res = ssm.send_command(
        InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
    )
    cmd_id = res['Command']['CommandId']
    for _ in range(15):
        time.sleep(3)
        out = ssm.get_command_invocation(CommandId=cmd_id, InstanceId=instance_id)
        if out['Status'] in ['Success', 'Failed', 'Cancelled', 'TimedOut']:
            with open("temp_aws_logs_output.txt", "w", encoding="utf-8") as f:
                f.write(out.get('StandardOutputContent', ''))
                f.write("\n\n---ERRORS---\n\n")
                f.write(out.get('StandardErrorContent', ''))
            print("Logs saved to temp_aws_logs_output.txt")
            return
    print("Timeout")

if __name__ == "__main__":
    fetch_logs()
