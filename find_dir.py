import json, subprocess, time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": ["find /home -name orbe-systems -type d"]
    }
}
with open("ssm_find.json", "w", encoding="utf-8") as f: json.dump(payload, f)

res = subprocess.check_output(
    ["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_find.json", "--region", "us-east-1", "--output", "json"],
    text=True
)
cmd_id = json.loads(res)["Command"]["CommandId"]

time.sleep(5)

out = subprocess.check_output(
    f"aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json",
    shell=True
)
data = json.loads(out.decode('utf-8', errors='replace'))
print("=== Output ===")
print(data.get("StandardOutputContent", ""))
