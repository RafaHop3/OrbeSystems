import json
import subprocess

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "docker exec orbe_postgres psql -U orbe_admin orbesystems -c \"UPDATE users SET role='premium', subscription_status='active' WHERE email='premiumtest@orbesystems.com';\"",
            "docker exec orbe_postgres psql -U orbe_admin orbesystems -c \"SELECT email, role, subscription_status FROM users WHERE email='premiumtest@orbesystems.com';\""
        ]
    }
}

with open("update_premium.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=4)

try:
    res = subprocess.check_output(
        ["aws", "ssm", "send-command", "--cli-input-json", "file://update_premium.json", "--region", "us-east-1", "--output", "json"],
        text=True
    )
    data = json.loads(res)
    command_id = data.get("Command", {}).get("CommandId")
    print(f"SSM Command ID: {command_id}")
except Exception as e:
    print(f"Error: {e}")
