import subprocess, json

ec2_python_script = """
import os
import subprocess

print("--- DOCKER PS ---")
print(subprocess.getoutput("sudo docker ps -a").decode('utf-8'))

print("\\n--- ORBE BACKEND LOGS ---")
print(subprocess.getoutput("sudo docker logs --tail 20 orbe_backend").decode('utf-8'))

print("\\n--- INHO BACKEND LOGS ---")
print(subprocess.getoutput("sudo docker logs --tail 20 inho_backend").decode('utf-8'))
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > health_probe.py\n" + ec2_python_script.replace('$', '\\$') + "\nEOF",
            "python3 health_probe.py"
        ]
    }
}

with open("health_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

output = subprocess.check_output([
    "aws", "ssm", "send-command",
    "--cli-input-json", "file://health_req.json",
    "--region", "us-east-1",
    "--output", "json"
])
cmd_id = json.loads(output)["Command"]["CommandId"]
print(cmd_id)
