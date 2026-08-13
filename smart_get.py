import json, subprocess
res = subprocess.check_output(
    ["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_logs_check.json", "--region", "us-east-1", "--output", "json"],
    text=True
)
cmd_id = json.loads(res)["Command"]["CommandId"]
print(f"ID is {cmd_id}")
