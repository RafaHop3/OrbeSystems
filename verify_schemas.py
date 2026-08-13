import json, subprocess, time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "echo '--- SCHEMAS ---'",
            "sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -c '\\dn'",
            "echo '--- GHOST ENGINE TABLES ---'",
            "sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -c '\\dt schema_ghostengine.*'",
            "echo '--- IMOBVERSE TABLES ---'",
            "sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -c '\\dt schema_imobverse.*'"
        ]
    }
}
with open("ssm_verify_schemas.json", "w", encoding="utf-8") as f: json.dump(payload, f)

res = subprocess.check_output(
    ["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_verify_schemas.json", "--region", "us-east-1", "--output", "json"],
    text=True
)
cmd_id = json.loads(res)["Command"]["CommandId"]
print("Dispatched:", cmd_id)

time.sleep(10)
out = subprocess.check_output(
    f"aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json",
    shell=True
)
data = json.loads(out)
if data.get("StandardOutputContent"):
    print(data["StandardOutputContent"])
else:
    print("Failed or still running:")
    print(data)
