import subprocess, json

py_script = """
import yaml

with open('docker-compose.yml', 'r') as f:
    compose = yaml.safe_load(f)

for svc in ['inho_backend']:
    if svc in compose['services']:
        envs = compose['services'][svc].get('environment', [])
        new_envs = []
        for e in envs:
            if e.startswith('DATABASE_URL='):
                e = e.replace('?sslmode=require', '')
            new_envs.append(e)
        compose['services'][svc]['environment'] = new_envs

with open('docker-compose.yml', 'w') as f:
    yaml.dump(compose, f, default_flow_style=False)
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > fix_ssl.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "python3 fix_ssl.py",
            "sudo docker compose up -d inho_backend"
        ]
    }
}
with open("fix_inho_ssl_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_inho_ssl_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(cmd_id)
