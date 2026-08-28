import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "sudo docker compose logs --tail 30 inho_backend"
        ]
    }
}

with open("log_inho.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://log_inho.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Waiting for {cmd_id}")
for _ in range(20):
    time.sleep(3)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            with open("inho_log_output.txt", "w", encoding="utf-8") as f:
                f.write(data.get("StandardOutputContent", ""))
                f.write("\n--ERR--\n")
                f.write(data.get("StandardErrorContent", ""))
            sys.exit(0)

sys.exit(1)
