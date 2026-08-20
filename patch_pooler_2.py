import subprocess, json

py_script = """
import yaml
import sys

with open('docker-compose.yml', 'r') as f:
    compose = yaml.safe_load(f)

supa_url_sync = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"
supa_url_async = "postgresql+asyncpg://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

for svc in ['backend', 'inho_backend']:
    if svc in compose['services']:
        envs = compose['services'][svc].get('environment', [])
        new_envs = [e for e in envs if not e.startswith('DATABASE_URL=')]
        new_url = supa_url_async if svc == 'inho_backend' else supa_url_sync
        new_envs.append(f"DATABASE_URL={new_url}")
        compose['services'][svc]['environment'] = new_envs

with open('docker-compose.yml', 'w') as f:
    yaml.dump(compose, f, default_flow_style=False)

res = subprocess.run(["sudo", "docker", "compose", "up", "-d", "backend", "inho_backend"], capture_output=True, text=True)
if res.returncode != 0:
    print("FAILED TO START")
    print(res.stdout)
    print(res.stderr)
    sys.exit(1)
print("SUCCESSFULLY RESTARTED CONTAINERS WITH POOLER")
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > patch_pooler_2.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "python3 patch_pooler_2.py"
        ]
    }
}
with open("patch_pooler2_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://patch_pooler2_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]
print(cmd_id)
