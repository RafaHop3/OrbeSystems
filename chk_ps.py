import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "sudo docker compose -f /home/ubuntu/orbe-systems/docker-compose.yml ps",
            "sudo docker compose -f /home/ubuntu/orbe-systems/docker-compose.yml logs --tail 40 inho_backend"
        ]
    }
}

with open("chk_ps_req.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://chk_ps_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]
print("CMD:", cmd_id)

for _ in range(25):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            with open("chk_ps_out.txt", "w", encoding="utf-8") as outf:
                outf.write(data.get("StandardOutputContent", ""))
                outf.write("\n--ERR--\n")
                outf.write(data.get("StandardErrorContent", ""))
            sys.exit(0 if status == 'Success' else 1)

sys.exit(1)
