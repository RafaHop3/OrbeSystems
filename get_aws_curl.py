import boto3
import time

def run():
    ssm = boto3.client('ssm', region_name='us-east-1')
    instance_id = "i-058e26140671b3254"
    commands = [
        "cd /home/ubuntu/OrbeSystems",
        "echo '=== ORBE LOGIN LOCAL ==='",
        "docker exec backend curl -s -X POST -H 'Content-Type: application/json' -d '{\"username\":\"rafael@orbesystems.com.br\",\"password\":\"Muhammadalivsroyjonesjr#Ju.130798\"}' http://localhost:8000/api/auth/login",
        "echo '\\n=== INHO LOGIN LOCAL ==='",
        "docker exec inho_backend curl -s -X POST -H 'Content-Type: application/json' -d '{\"username\":\"rafael@orbesystems.com.br\",\"password\":\"Muhammadalivsroyjonesjr#Ju.130798\"}' http://localhost:8000/api/v1/auth/login",
        "echo '\\n=== ENV KEEP_ALIVE_URL ==='",
        "grep KEEP_ALIVE_URL /home/ubuntu/OrbeSystems/.env",
        "grep KEEP_ALIVE_URL /home/ubuntu/OrbeSystems/inho_backend/.env"
    ]
    res = ssm.send_command(InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands})
    cmd_id = res['Command']['CommandId']
    for _ in range(10):
        time.sleep(3)
        out = ssm.get_command_invocation(CommandId=cmd_id, InstanceId=instance_id)
        if out['Status'] in ['Success', 'Failed']:
            with open("temp_aws_curl.txt", "w") as f:
                f.write(out.get('StandardOutputContent', ''))
                f.write("\n\n---ERRORS---\n\n")
                f.write(out.get('StandardErrorContent', ''))
            print("Done writing to temp_aws_curl.txt")
            return
    print("Timeout")

if __name__ == "__main__":
    run()
