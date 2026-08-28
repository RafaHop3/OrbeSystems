import base64
import subprocess, json, time, sys

with open(r"d:\OrbeSystems\orbe-systems\inho_backend\routers\auth.py", "rb") as f:
    code = f.read()
b64_code = base64.b64encode(code).decode("utf-8")

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "echo '" + b64_code + "' | base64 -d > /tmp/auth.py",
            "sudo docker cp /tmp/auth.py inho_backend:/app/routers/auth.py",
            "sudo docker restart inho_backend",
            "echo 'DONE DEPLOYING AUTH FIX'"
        ]
    }
}

with open("deploy_auth.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://deploy_auth.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Wait...")
for _ in range(25):
    time.sleep(3)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent", ""))
            print("-- ERR --")
            print(data.get("StandardErrorContent", ""))
            sys.exit(0)
print("Timeout")
sys.exit(1)
