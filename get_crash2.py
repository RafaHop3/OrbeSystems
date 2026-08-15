import subprocess, json, time, sys
payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": ["cd /home/ubuntu/orbe-systems && sudo docker compose up -d --build"]
    }
}
with open("test_up.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://test_up.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]
for _ in range(12):
    time.sleep(10)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            with open("ec2_crash2.txt", "w", encoding="utf-8") as lf:
                lf.write(data.get("StandardOutputContent", ""))
                lf.write("\n--ERR--\n")
                lf.write(data.get("StandardErrorContent", ""))
            sys.exit(0)
