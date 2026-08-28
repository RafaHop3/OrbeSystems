import subprocess, json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "sudo docker compose ps",
            "sudo docker compose logs --tail 30 inho_backend"
        ]
    }
}

with open("verify_crash.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://verify_crash.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

import time, sys
for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            with open("verify_crash_out.txt", "w", encoding="utf-8") as outf:
                outf.write(data.get("StandardOutputContent", ""))
                outf.write("\n--ERR--\n")
                outf.write(data.get("StandardErrorContent", ""))
            sys.exit(0 if status == 'Success' else 1)
