import subprocess, json, time

print("1. Checking Database Records for PROCESSANDO/SUCCESS")
payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -t -c \"SELECT id, target_broker, status, created_at FROM schema_ghostengine.optout_requests ORDER BY created_at DESC LIMIT 3;\""
        ]
    }
}
with open("ssm_check.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_check.json", "--region", "us-east-1", "--output", "json"], text=True)
cmd_id = json.loads(res)["Command"]["CommandId"]
time.sleep(4)
out = subprocess.check_output(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], text=True)
print(json.loads(out).get("StandardOutputContent", ""))

print("2. Checking Github Actions Workflows")
import os
try:
    gh_runs = subprocess.check_output("gh run list --repo RafaHop3/OrbeSystems --limit 3", shell=True, text=True)
    print(gh_runs)
except Exception as e:
    print("Could not run gh CLI:", e)
