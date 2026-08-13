import json
import subprocess
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems || cd /home/ubuntu/OrbeSystems",
            "git pull origin main",
            "sudo docker compose pull",
            "sudo docker compose down",
            "sudo docker compose build backend",
            "sudo docker compose up -d",
            "echo 'BACKEND_DEPLOY_COMPLETE'"
        ]
    }
}

with open("deploy_backend_fixed.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

try:
    res = subprocess.check_output(
        ["aws", "ssm", "send-command", "--cli-input-json", "file://deploy_backend_fixed.json", "--region", "us-east-1", "--output", "json"],
        text=True
    )
    cmd_id = json.loads(res)["Command"]["CommandId"]
    print(f"Sent: {cmd_id}")
    
    for i in range(12):
        time.sleep(10)
        out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
        if out.returncode == 0:
            data = json.loads(out.stdout.decode('utf-8', errors='replace'))
            if data.get("Status") in ["Success", "Failed"]:
                print("STATUS:", data.get("Status"))
                print(data.get("StandardOutputContent", ""))
                import sys
                print("ERR:", data.get("StandardErrorContent", ""), file=sys.stderr)
                break
except Exception as e:
    print(f"Error: {e}")
