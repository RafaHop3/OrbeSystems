import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "sudo docker compose ps",
            "sudo docker compose logs backend --tail 100",
            "sudo docker compose logs inho_backend --tail 100"
        ]
    }
}

with open("temp_log_req.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://temp_log_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Command ID: {cmd_id}")
for _ in range(15):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            with open("ssm_logs_output.json", "w", encoding="utf-8") as outf:
                json.dump(data, outf, indent=2)
            sys.exit(0)

sys.exit(1)
