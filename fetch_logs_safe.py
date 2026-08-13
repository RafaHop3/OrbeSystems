import subprocess
import json
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cat /home/ubuntu/orbe-systems/docker-compose.yml",
            "sudo docker compose -f /home/ubuntu/orbe-systems/docker-compose.yml ps"
        ]
    }
}
with open("ssm_logs_safe.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_logs_safe.json", "--region", "us-east-1", "--output", "json"], text=True, encoding='utf-8')
cmd_id = json.loads(res)["Command"]["CommandId"]

for i in range(5):
    time.sleep(4)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print("=== OUTPUT ===")
            print(data.get("StandardOutputContent", ""))
            break
