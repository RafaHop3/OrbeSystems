import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "sudo docker builder prune -af",
            "sudo docker image prune -af",
            "df -h /",
            "sudo docker compose build --no-cache inho_backend",
            "sudo docker compose up -d --force-recreate inho_backend",
            "sudo docker compose ps",
            "sudo docker compose logs --tail 30 orbe_backend",
            "sudo docker compose logs --tail 30 inho_backend"
        ]
    }
}

with open("fix_inho_req.json", "w") as f:
    json.dump(payload, f)

import os
env = os.environ.copy()
env["PYTHONIOENCODING"] = "utf-8"

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_inho_req.json", "--region", "us-east-1", "--output", "json"], env=env)
cmd_id = json.loads(res)["Command"]["CommandId"]

for _ in range(70):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], env=env, capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            print("Status:", data.get("Status"))
            with open("fix_inho_out.txt", "w", encoding="utf-8") as outf:
                outf.write(data.get("StandardOutputContent", ""))
                outf.write("\n--ERR--\n")
                outf.write(data.get("StandardErrorContent", ""))
            sys.exit(0 if data.get("Status") == 'Success' else 1)

print("Timeout")
sys.exit(1)
