import subprocess, json, time, sys

with open("test_user_flow.py", "r", encoding="utf-8") as rf:
    test_code = rf.read()

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > test_script.py",
            test_code,
            "EOF",
            "sudo apt-get install -y python3-requests || pip install requests || true",
            "python3 test_script.py"
        ]
    }
}
with open("test_req.json", "w", encoding="utf-8") as f: json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://test_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Wait...")
for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent", ""))
            print("--ERR--")
            print(data.get("StandardErrorContent", ""))
            sys.exit(0 if data.get("Status") == "Success" else 1)
print("Timeout")
sys.exit(1)
