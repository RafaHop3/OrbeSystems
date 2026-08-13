import subprocess
import json
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo docker rm -f orbe_redis orbe_backend",
            "cd /home/ubuntu/orbe-systems && sudo docker compose up -d",
            "sudo docker ps"
        ]
    }
}
with open("ssm_fix_compose.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_fix_compose.json", "--region", "us-east-1", "--output", "json"], text=True, encoding='utf-8')
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Sent command: {cmd_id}")
for i in range(10):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data_text = out.stdout.decode('utf-8', errors='replace')
        try:
            data = json.loads(data_text)
            if data.get("Status") in ["Success", "Failed"]:
                print("STATUS:", data.get("Status"))
                print(data.get("StandardOutputContent", ""))
                if data.get("StandardErrorContent"):
                    print("ERR:", data.get("StandardErrorContent", ""))
                break
        except Exception:
            pass
