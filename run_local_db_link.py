import subprocess, json, time, sys, base64

with open("docker-compose.yml", "rb") as f:
    b = f.read()

compose = b.decode("utf-8", errors="replace")
b64_content = base64.b64encode(compose.encode("utf-8")).decode("utf-8")

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            f"echo '{b64_content}' | base64 -d > docker-compose.yml",
            "sudo docker compose up -d --force-recreate inho_backend",
            "sudo docker compose ps"
        ]
    }
}

with open("fix_db_migration_local.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_db_migration_local.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

import time
import sys
for _ in range(20):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            print("Status:", status)
            sys.exit(0 if status == 'Success' else 1)

print("Timeout waiting")
sys.exit(1)
