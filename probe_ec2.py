import json, subprocess, time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cat /home/ubuntu/OrbeSystems/backend/routes/checkout.py | head -n 70 | tail -n 25"
        ]
    }
}
with open("ssm_probe.json", "w", encoding="utf-8") as f: json.dump(payload, f)

res = subprocess.check_output(
    ["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_probe.json", "--region", "us-east-1", "--output", "json"],
    text=True, encoding="utf-8"
)
cmd_id = json.loads(res)["Command"]["CommandId"]

time.sleep(5)
subprocess.run(
    f"aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json > probe_out.json",
    shell=True
)
