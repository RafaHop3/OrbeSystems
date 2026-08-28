import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "sudo docker compose -f /home/ubuntu/orbe-systems/docker-compose.yml exec -T db psql -U orbe_admin -d orbesystems -c \"ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(255) DEFAULT '$2b$12$R.SjK36B5P2vT1Qe5D9SseY5N/C.t9F2P9Jv2r3e4T5U6V7W8X9Y0', ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE, ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE, ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;\"",
            "sudo docker compose -f /home/ubuntu/orbe-systems/docker-compose.yml exec -T db psql -U orbe_admin -d orbesystems -c \"INSERT INTO public.users (id, email, hashed_password, password_hash, role, full_name, is_email_verified) VALUES ('d8c47f7d-07ab-4318-971c-7cb8b9c6d482', 'robo_tester_csp@inho.com', '\\$2b\\$12\\$zMpsJ0d6A1V0vLh/Y0Y/7OXpQk5S9Bf9R/2l8gkV.D5C7s4w1Q1K2', '\\$2b\\$12\\$zMpsJ0d6A1V0vLh/Y0Y/7OXpQk5S9Bf9R/2l8gkV.D5C7s4w1Q1K2', 'ADMIN', 'Robo CSP Tester', true) ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password;\""
        ]
    }
}

with open("fix_psql2.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_psql2.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

for _ in range(15):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            print("Status:", status)
            print("StandardOutputContent:")
            print(data.get("StandardOutputContent"))
            print("StandardErrorContent:")
            print(data.get("StandardErrorContent"))
            sys.exit(0 if status == 'Success' else 1)

print("Timeout waiting")
sys.exit(1)
