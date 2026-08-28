import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "sudo docker compose up -d > compose_err.txt 2>&1 || true",
            "cat compose_err.txt"
        ]
    }
}
with open("get_err_req.json", "w") as f: json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://get_err_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Wait...")
for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            with open("docker_err_actual.txt", "w", encoding="utf-8") as lf:
                lf.write(data.get("StandardOutputContent", ""))
                lf.write("\n---\n")
                lf.write(data.get("StandardErrorContent", ""))
            print("Done")
            sys.exit(0)
