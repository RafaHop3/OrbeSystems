import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "sudo docker system prune -af",
            "sudo docker builder prune -af",
            "df -h /",
            "sudo docker compose build --no-cache inho_backend backend",
            "sudo docker compose up -d --force-recreate inho_backend backend"
        ]
    }
}

with open("fix_disk_req.json", "w") as f:
    json.dump(payload, f)

import os
env = os.environ.copy()
env["PYTHONIOENCODING"] = "utf-8"

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_disk_req.json", "--region", "us-east-1", "--output", "json"], env=env)
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Command ID: {cmd_id}")
for _ in range(60):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], env=env, capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            print("Status:", status)
            with open("fix_disk_out.txt", "w", encoding="utf-8") as outf:
                outf.write(data.get("StandardOutputContent", ""))
                outf.write("\n--ERR--\n")
                outf.write(data.get("StandardErrorContent", ""))
            sys.exit(0 if status == 'Success' else 1)

print("Timeout waiting for rebuild.")
sys.exit(1)
