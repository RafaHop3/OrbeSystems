import subprocess
import json
import time
import sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "echo '--- DOCKER PS ---'",
            "sudo docker ps -a",
            "echo '--- backend logs ---'",
            "sudo docker logs orbe_backend --tail 50",
            "echo '--- inho_backend logs ---'",
            "sudo docker logs inho_backend --tail 50",
            "echo '--- docker-compose logs inho_backend ---'",
            "sudo docker compose logs inho_backend"
        ]
    }
}

with open("temp_log_req.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output([
    "aws", "ssm", "send-command",
    "--cli-input-json", "file://temp_log_req.json",
    "--region", "us-east-1",
    "--output", "json"
])
cmd_id = json.loads(res)["Command"]["CommandId"]

for _ in range(12):
    time.sleep(5)
    out = subprocess.run([
        "aws", "ssm", "get-command-invocation",
        "--command-id", cmd_id,
        "--instance-id", "i-058e26140671b3254",
        "--region", "us-east-1",
        "--output", "json"
    ], capture_output=True)
    
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print("Status:", data.get("Status"))
            print("OUT:\n", data.get("StandardOutputContent"))
            print("ERR:\n", data.get("StandardErrorContent"))
            sys.exit(0)

print("Timeout")
sys.exit(1)
