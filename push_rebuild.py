import subprocess, json, time, sys

with open(r"d:\OrbeSystems\orbe-systems\inho_backend\req_clean.txt", "r", encoding="ascii") as f:
    req_content = f.read()

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems/inho_backend",
            "cat << 'EOF' > requirements.txt\n" + req_content.replace('$', '\\$') + "\nEOF",
            "sudo docker compose build --no-cache inho_backend",
            "sudo docker compose up -d --force-recreate inho_backend",
            "sudo docker compose logs inho_backend --tail 50",
            "sudo docker compose ps"
        ]
    }
}

with open("push_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

import os
env = os.environ.copy()
env["PYTHONIOENCODING"] = "utf-8"

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://push_req.json", "--region", "us-east-1", "--output", "json"], env=env)
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Command ID: {cmd_id}")
for _ in range(40): # Wait up to 200s for a complete build
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], env=env, capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            print("Status:", status)
            with open("push_out.txt", "w", encoding="utf-8") as outf:
                outf.write(data.get("StandardOutputContent", ""))
                outf.write("\n--ERR--\n")
                outf.write(data.get("StandardErrorContent", ""))
            sys.exit(0 if status == 'Success' else 1)

print("Timeout waiting for rebuild.")
sys.exit(1)
