import subprocess, json

py_script = """
import yaml

with open('docker-compose.yml', 'r') as f:
    compose = yaml.safe_load(f)

supa_url_sync = "postgresql://postgres:Muhammadalivsroyjonesjr%23Ju.130798@db.bjidrhoniciczqkhazqv.supabase.co:5432/postgres?sslmode=require"
supa_url_async = "postgresql+asyncpg://postgres:Muhammadalivsroyjonesjr%23Ju.130798@db.bjidrhoniciczqkhazqv.supabase.co:5432/postgres?sslmode=require"

for svc in ['inho_backend', 'orbe_backend']:
    if svc in compose['services']:
        envs = compose['services'][svc].get('environment', [])
        
        # Remove any existing DATABASE_URL
        new_envs = [e for e in envs if not e.startswith('DATABASE_URL=')]
        
        url_to_add = supa_url_async if svc == 'inho_backend' else supa_url_sync
        new_envs.append(f"DATABASE_URL={url_to_add}")
        
        compose['services'][svc]['environment'] = new_envs

with open('docker-compose.yml', 'w') as f:
    yaml.dump(compose, f, default_flow_style=False)
print('Fixed docker-compose.yml')
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > fix_url.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "python3 fix_url.py",
            "sudo docker compose up -d inho_backend"
        ]
    }
}
with open("fix_inho_url_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_inho_url_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(cmd_id)
