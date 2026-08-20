import subprocess, json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo docker logs --tail 100 orbe_backend > /tmp/orbe_log.txt",
            "cat /tmp/orbe_log.txt"
        ]
    }
}

with open("verify_orbe_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

output = subprocess.check_output([
    "aws", "ssm", "send-command",
    "--cli-input-json", "file://verify_orbe_req.json",
    "--region", "us-east-1",
    "--output", "json"
])
cmd_id = json.loads(output)["Command"]["CommandId"]

print(cmd_id)
