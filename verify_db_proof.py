import subprocess
import json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -c \"SELECT id, user_id, status, target_broker, created_at FROM public.optout_requests WHERE id::text LIKE '2525fb0a%' OR id::text LIKE '8c46bd66%';\""
        ]
    }
}
with open("ssm_verify_real_data.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_verify_real_data.json", "--region", "us-east-1", "--output", "json"], text=True)
cmd_id = json.loads(res)["Command"]["CommandId"]
print(f"Sent: {cmd_id}")
