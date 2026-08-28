import subprocess, json, time, sys

python_patch_script = """
import yaml

with open('docker-compose.yml') as f:
    data = yaml.safe_load(f)

if 'image' in data['services']['backend']:
    del data['services']['backend']['image']
data['services']['backend']['build'] = './backend'

with open('docker-compose.yml', 'w') as f:
    yaml.dump(data, f)

print("Patched docker-compose.yml to build backend locally.")
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "git pull origin main || true",
            "cat << 'EOF' > patch_compose.py\n" + python_patch_script.replace('$', '\\$') + "\nEOF",
            "sudo apt-get update && sudo apt-get install -y python3-yaml",
            "python3 patch_compose.py",
            "sudo docker compose build --no-cache backend",
            "sudo docker compose up -d --force-recreate backend",
            "sudo docker compose logs backend --tail 50",
            "sudo docker compose ps"
        ]
    }
}

with open("build_orbe_local.json", "w") as f:
    json.dump(payload, f)

import os
env = os.environ.copy()
env["PYTHONIOENCODING"] = "utf-8"

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://build_orbe_local.json", "--region", "us-east-1", "--output", "json"], env=env)
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Command ID: {cmd_id}")
for _ in range(50):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], env=env, capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            print("Status:", status)
            with open("build_orbe_out.txt", "w", encoding="utf-8") as outf:
                outf.write(data.get("StandardOutputContent", ""))
                outf.write("\n--ERR--\n")
                outf.write(data.get("StandardErrorContent", ""))
            sys.exit(0 if status == 'Success' else 1)

print("Timeout waiting for rebuild.")
sys.exit(1)
