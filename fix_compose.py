import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            # Fix orbe_backend URL
            "sudo sed -i 's/DATABASE_URL=postgresql+asyncpg/DATABASE_URL=postgresql/g' docker-compose.yml",
            # Fix inho_backend URL (revert it back to +asyncpg since inho DOES need asyncpg!)
            # Wait, sed above replaced both! Let's specifically target the inho_backend line or just let both use postgresql?
            # It's better to explicitly replace just the backend one. We'll use python on EC2.
            "cat << 'EOF' > fix.py",
            "import yaml",
            "with open('docker-compose.yml') as f:",
            "  data = yaml.safe_load(f)",
            "for item in data['services']['backend']['environment']:",
            "  if item.startswith('DATABASE_URL='):",
            "    data['services']['backend']['environment'].remove(item)",
            "    data['services']['backend']['environment'].append(item.replace('+asyncpg', ''))",
            "    break",
            "with open('docker-compose.yml', 'w') as f:",
            "  yaml.dump(data, f)",
            "EOF",
            "sudo apt-get install -y python3-yaml",
            "sudo git restore docker-compose.yml || true",
            "sudo chmod 666 docker-compose.yml",
            "python3 fix.py",
            "cat docker-compose.yml",
            "sudo cat inho_backend/requirements.txt > req.txt",
            "cat req.txt"
        ]
    }
}
with open("fix_comp_req.json", "w") as f: json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_comp_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Wait...")
for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            with open("fix_comp_out.txt", "w", encoding="utf-8") as lf:
                lf.write(data.get("StandardOutputContent", ""))
                lf.write("\n---\n")
                lf.write(data.get("StandardErrorContent", ""))
            print("Done")
            sys.exit(0)
