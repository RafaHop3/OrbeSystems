import subprocess, json, time, sys

py_script = """
import yaml

with open('docker-compose.yml', 'r') as f:
    compose = yaml.safe_load(f)

# The inho_backend service needs postgresql+asyncpg
for env_str in compose['services']['inho_backend']['environment']:
    if env_str.startswith('DATABASE_URL='):
        compose['services']['inho_backend']['environment'].remove(env_str)
        new_url = env_str.replace('DATABASE_URL=postgresql://', 'DATABASE_URL=postgresql+asyncpg://')
        compose['services']['inho_backend']['environment'].append(new_url)

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
            "cat << 'EOF' > fix_compose.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "sudo apt-get install -y python3-yaml > /dev/null 2>&1 || true",
            "python3 fix_compose.py",
            "sudo docker compose up -d inho_backend"
        ]
    }
}
with open("fix_compose_async.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_compose_async.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(cmd_id)
