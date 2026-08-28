import subprocess, json

ec2_python_script = """
import os

filepath = 'inho_backend/db/session.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = 'engine_kwargs.setdefault("connect_args", {})'
replacement = 'engine_kwargs.setdefault("connect_args", {})\n    engine_kwargs["connect_args"]["statement_cache_size"] = 0'

if target in content and replacement not in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched session.py on EC2 successfully.")
else:
    print("Target not found or already patched.")
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > patch_session_2.py\n" + ec2_python_script.replace('$', '\\$') + "\nEOF",
            "python3 patch_session_2.py",
            "sudo docker compose build inho_backend",
            "sudo docker compose up -d inho_backend"
        ]
    }
}

with open("patch_remote2_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://patch_remote2_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(cmd_id)
