import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "sudo docker compose ps",
            "sudo docker compose logs --tail 50 inho_backend",
            "sudo docker compose logs --tail 50 backend"
        ]
    }
}

with open("fix_logs_req.json", "w") as f:
    json.dump(payload, f)

import os
env = os.environ.copy()
env["PYTHONIOENCODING"] = "utf-8"

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_logs_req.json", "--region", "us-east-1", "--output", "json"], env=env)
cmd_id = json.loads(res)["Command"]["CommandId"]

for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], env=env, capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent"))
            print("---ERR---")
            print(data.get("StandardErrorContent"))
            break
sys.exit(0)
