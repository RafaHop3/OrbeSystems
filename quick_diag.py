import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo docker ps -a",
            "sudo cat /home/ubuntu/orbe-systems/backend/.env",
            "sudo docker logs orbe_backend --tail 50",
            "sudo docker logs inho_backend --tail 50"
        ]
    }
}
with open("diag_req.json", "w") as f: json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://diag_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

for _ in range(10):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            with open("diag_out.txt", "w", encoding="utf-8") as lf:
                lf.write(data.get("StandardOutputContent", ""))
                lf.write("\n--ERR--\n")
                lf.write(data.get("StandardErrorContent", ""))
            print("Done. See diag_out.txt")
            sys.exit(0)
print("Timeout")
