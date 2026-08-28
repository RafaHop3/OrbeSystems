import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "sudo docker compose down",
            "sed -i 's/- 80:8000/- 8000:8000/g' docker-compose.yml",
            "sudo docker compose up -d",
            "sudo bash -c 'cat << \"EOF\" > /etc/nginx/sites-available/default\nserver {\n    listen 80;\n    server_name api.orbesystems.com.br;\n    location / {\n        proxy_pass http://localhost:8000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n}\nserver {\n    listen 80;\n    server_name inho-api.orbesystems.com.br;\n    location / {\n        proxy_pass http://localhost:8001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n}\nEOF'",
            "sudo nginx -t",
            "sudo systemctl restart nginx",
            "echo 'SUCCESS NGINX PORTS'"
        ]
    }
}
with open("fix_ports.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_ports.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Wait...")
for _ in range(25):
    time.sleep(3)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent", ""))
            print("-- ERR --")
            print(data.get("StandardErrorContent", ""))
            sys.exit(0)
print("Timeout")
sys.exit(1)
