import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "sudo systemctl stop postgresql || true",
            "sudo systemctl stop nginx || true",
            "sudo systemctl stop apache2 || true",
            "sudo docker compose down",
            "sudo docker compose up -d --force-recreate",
            "sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -c \"UPDATE public.users SET role='admin' WHERE email='admin@inho.io';\" || true",
            "sudo docker exec inho_backend python /app/seed_inho.py || echo 'seed_inho missed'"
        ]
    }
}
with open("fix_auth3.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_auth3.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Waiting for response...")
for _ in range(25):
    time.sleep(3)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent", ""))
            print("-- ERR --")
            print(data.get("StandardErrorContent", ""))
            sys.exit(0)
print("Timeout")
sys.exit(1)
