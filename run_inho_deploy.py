import json
import subprocess
import time
import base64
import os

with open("inho_backend/scripts/deploy_aws_ec2.sh", "rb") as f:
    script_b64 = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /opt/orbe-systems/inho_backend",
            "echo '" + script_b64 + "' | base64 --decode > deploy_aws_ec2.sh",
            "chmod +x deploy_aws_ec2.sh",
            "sudo ./deploy_aws_ec2.sh"
        ]
    }
}

with open("temp_inho_deploy.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

print("Dispatching INHO Blue/Green Deployment to AWS EC2...")
try:
    res = subprocess.check_output(
        ["aws", "ssm", "send-command", "--cli-input-json", "file://temp_inho_deploy.json", "--region", "us-east-1", "--output", "json"],
        text=True
    )
    cmd_id = json.loads(res)["Command"]["CommandId"]
    print(f"Dispatched Command ID: {cmd_id}")
    time.sleep(10)
    
    out = subprocess.check_output(
        ["aws", "ssm", "list-command-invocations", "--command-id", cmd_id, "--details", "--output", "json"],
        text=True
    )
    inv = json.loads(out)
    if "CommandInvocations" in inv and len(inv["CommandInvocations"]) > 0:
        status = inv["CommandInvocations"][0]["Status"]
        output = inv["CommandInvocations"][0]["CommandPlugins"][0]["Output"]
        print(f"Status: {status}")
        print(output)
except Exception as e:
    print(f"Error: {e}")
