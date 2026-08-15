import subprocess, json, time, sys
try:
    print("Sending command...")
    payload = {
        "DocumentName": "AWS-RunShellScript",
        "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
        "Parameters": {
            "commands": ["cd /home/ubuntu/orbe-systems && sudo docker compose ps && sudo docker compose logs backend --tail 30"]
        }
    }
    with open("log_req.json", "w") as f: json.dump(payload, f)
    res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://log_req.json", "--region", "us-east-1", "--output", "json"])
    cmd_id = json.loads(res)["Command"]["CommandId"]
    print(f"Sent {cmd_id}. Waiting...")
    for _ in range(5):
        time.sleep(5)
        out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
        if out.returncode == 0:
            data = json.loads(out.stdout.decode('utf-8', errors='replace'))
            if data.get("Status") in ["Success", "Failed"]:
                with open("ec2_docker_logs.txt", "w", encoding="utf-8") as lf:
                    lf.write(data.get("StandardOutputContent", ""))
                    lf.write("\n--ERR--\n")
                    lf.write(data.get("StandardErrorContent", ""))
                print("Logs saved to ec2_docker_logs.txt")
                sys.exit(0)
    print("Timeout.")
except Exception as e:
    print(e)
