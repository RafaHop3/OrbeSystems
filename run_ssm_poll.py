import subprocess
import json
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "echo --- DOCKER PS ---",
            "sudo docker ps -a",
            "echo --- NGINX LOGS ---",
            "sudo docker logs --tail 20 backend-nginx-1 2>&1 || true",
            "echo --- BACKEND LOGS ---",
            "sudo docker logs --tail 20 backend-api-1 2>&1 || true"
        ]
    }
}

with open("ssm_diag_temp.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

try:
    result = subprocess.check_output(
        ["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_diag_temp.json", "--region", "us-east-1"]
    ).decode("utf-8")
    cmd_id = json.loads(result)["Command"]["CommandId"]
    print(f"Dispatched command: {cmd_id}")
    
    for _ in range(15):
        time.sleep(3)
        poll = subprocess.check_output(
            ["aws", "ssm", "list-command-invocations", "--command-id", cmd_id, "--details", "--region", "us-east-1"]
        ).decode("utf-8")
        poll_json = json.loads(poll)
        if poll_json["CommandInvocations"]:
            status = poll_json["CommandInvocations"][0]["Status"]
            print(f"Status: {status}")
            if status in ["Success", "Failed", "Cancelled", "TimedOut"]:
                plugin = poll_json["CommandInvocations"][0]["CommandPlugins"][0]
                print(f"Output:\n{plugin.get('Output', '')}")
                break
except Exception as e:
    print(f"Error: {e}")
