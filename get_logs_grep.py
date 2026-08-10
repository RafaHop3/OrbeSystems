import json, subprocess, time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": ["docker logs --tail 25000 orbe_backend 2>&1 | grep -i 'optout\\|worker\\|playwright'"]
    }
}
with open("ssm_logs_grep.json", "w", encoding="utf-8") as f: json.dump(payload, f)

res = subprocess.check_output(
    ["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_logs_grep.json", "--region", "us-east-1", "--output", "json"],
    text=True
)
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Waiting for CMD: {cmd_id}")
time.sleep(12)

out = subprocess.check_output(
    f"aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json",
    shell=True
)
data = json.loads(out.decode('utf-8', errors='replace'))
with open("ec2_docker_optout.txt", "w", encoding="utf-8") as f:
    f.write(data.get("StandardOutputContent", ""))
    f.write("\n\n=== ERRORS ===\n\n")
    f.write(data.get("StandardErrorContent", ""))
