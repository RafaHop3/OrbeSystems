import subprocess, json, time, sys

env_file = "/home/ubuntu/orbe-systems/backend/.env"
supabase_url = "postgresql://postgres:Muhammadalivsroyjonesjr@db.zgdtyzaxoqziroqjqgni.supabase.co:5432/postgres"

# Command to sed replace the DATABASE_URL and restart docker backend
script = f"""
sudo sed -i '/^DATABASE_URL=/d' {env_file}
echo 'DATABASE_URL={supabase_url}' | sudo tee -a {env_file}
cd /home/ubuntu/orbe-systems
sudo docker compose down orbe_backend
sudo docker compose up -d orbe_backend
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": ["cat << 'EOF' > /tmp/migrate.sh", script, "EOF", "bash /tmp/migrate.sh"]
    }
}
with open("mig_req.json", "w") as f: json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://mig_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Migrating backend connection... waiting for completion.")
for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent", ""))
            print(data.get("StandardErrorContent", ""))
            sys.exit(0 if data.get("Status") == "Success" else 1)
print("Timeout")
sys.exit(1)
