import subprocess
import json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo systemctl restart cloudflared",
            "sudo systemctl status cloudflared"
        ]
    }
}
with open("ssm_restart_cf.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_restart_cf.json", "--region", "us-east-1", "--output", "json"], text=True)
print(f"Sent: {json.loads(res)['Command']['CommandId']}")
