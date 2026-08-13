import subprocess
import json
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo ls -la /home/ubuntu/orbe-systems/backend",
            "sudo cat /home/ubuntu/orbe-systems/backend/.env || echo 'NO ENV FILE'",
            "sudo systemctl status nginx || echo 'NGINX SYSTEMCTL FAILED'",
            "sudo docker compose -f /home/ubuntu/OrbeSystems/docker-compose.yml ps || echo 'No compose in OrbeSystems'",
            "sudo grep proxy /var/log/nginx/error.log || true"
        ]
    }
}
with open("ssm_check_env.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_check_env.json", "--region", "us-east-1", "--output", "json"], text=True)
cmd_id = json.loads(res)["Command"]["CommandId"]

for i in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data_text = out.stdout.decode('utf-8', errors='replace')
        try:
            data = json.loads(data_text)
            if data.get("Status") in ["Success", "Failed"]:
                print("STATUS:", data.get("Status"))
                print(data.get("StandardOutputContent", ""))
                import sys
                print("ERR:", data.get("StandardErrorContent", ""), file=sys.stderr)
                break
        except Exception:
            pass
