import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "sudo sed -i 's/\"80:8000\"/\"8000:8000\"/g' docker-compose.yml",
            "sudo systemctl restart nginx || true",
            "sudo docker compose up -d"
        ]
    }
}
with open("fix_final_req.json", "w") as f: json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_final_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent", ""))
            print(data.get("StandardErrorContent", ""))
            sys.exit(0 if data.get("Status") == "Success" else 1)
sys.exit(1)
