import subprocess, json

ec2_python_script = """
import os

filepath = 'inho_backend/db/session.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = 'engine_kwargs["connect_args"] = {"ssl": _ssl_ctx}'

replacement = '''
    engine_kwargs.setdefault("connect_args", {})
    engine_kwargs["connect_args"]["server_settings"] = {"search_path": "inho, public"}
    if "supabase" in settings.DATABASE_URL or "render.com" in settings.DATABASE_URL:
        engine_kwargs["connect_args"]["ssl"] = _ssl_ctx
'''

content = content.replace(target, replacement.strip())

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched session.py on EC2 successfully.")
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > patch_session.py\n" + ec2_python_script.replace('$', '\\$') + "\nEOF",
            "python3 patch_session.py",
            "sudo docker compose build inho_backend",
            "sudo docker compose up -d inho_backend"
        ]
    }
}

with open("patch_remote_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://patch_remote_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(cmd_id)
