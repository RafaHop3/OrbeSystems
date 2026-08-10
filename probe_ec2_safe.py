import json, subprocess, time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": ["cat /home/ubuntu/OrbeSystems/backend/routes/checkout.py"]
    }
}
with open("ssm_probe2.json", "w", encoding="utf-8") as f: json.dump(payload, f)

res = subprocess.check_output(
    ["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_probe2.json", "--region", "us-east-1", "--output", "json"],
)
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Wait 5s")
time.sleep(5)

out = subprocess.check_output(
    f"aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json",
    shell=True
)
data = json.loads(out.decode('utf-8', errors='replace'))
with open("ec2_checkout.py", "w", encoding="utf-8") as f:
    f.write(data.get("StandardOutputContent", ""))
