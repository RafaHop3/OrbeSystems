import subprocess, json

py_script = """
import os

files_to_patch = [
    '/home/ubuntu/orbe-systems/inho_backend/routers/auth.py',
    '/home/ubuntu/orbe-systems/inho_backend/routers/ghost_engine.py'
]

for fpath in files_to_patch:
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = content.replace("from services.auth import get_current_user", "from core.deps import get_current_user")
        
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {fpath}")
    else:
        print(f"File not found: {fpath}")
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > patch_ec2_imports.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "sudo python3 patch_ec2_imports.py",
            "sudo docker compose build --no-cache inho_backend",
            "sudo docker compose up -d --force-recreate inho_backend",
            "sudo docker compose ps"
        ]
    }
}

with open("patch_ec2_req.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://patch_ec2_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Command ID:", cmd_id)

import time
for _ in range(40):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            with open("patch_ec2_out.txt", "w", encoding="utf-8") as outf:
                outf.write(data.get("StandardOutputContent", ""))
                outf.write("\n--ERR--\n")
                outf.write(data.get("StandardErrorContent", ""))
            print("Status:", status)
            import sys
            sys.exit(0 if status == 'Success' else 1)

import sys
sys.exit(1)
