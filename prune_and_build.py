import subprocess, json, sys, time

py_script = """
import os
import subprocess

print("Disk space before:")
subprocess.run(["df", "-h"])

print("Pruning docker...")
subprocess.run(["sudo", "docker", "system", "prune", "-a", "-f", "--volumes"])

print("Disk space after:")
subprocess.run(["df", "-h"])

print("Rebuilding inho_backend...")
res = subprocess.run(["sudo", "docker", "compose", "build", "--no-cache", "inho_backend"], capture_output=True, text=True)

if res.returncode != 0:
    print("BUILD FAILED!")
    print(res.stdout)
    print(res.stderr)
else:
    print("BUILD SUCCESS!")
    subprocess.run(["sudo", "docker", "compose", "up", "-d", "--force-recreate", "inho_backend"])
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > prune_build.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "python3 prune_build.py > prune_build.log 2>&1"
        ]
    }
}
with open("prune_build_req.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://prune_build_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print(cmd_id)
