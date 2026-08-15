import subprocess, json, time, sys
payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo docker system prune -a -f --volumes",
            "sudo apt-get clean -y",
            "sudo rm -rf /var/cache/apt/archives/*",
            "cd /home/ubuntu/orbe-systems",
            "sudo sed -i 's/\"8000:8000\"/\"80:8000\"/g' /home/ubuntu/orbe-systems/docker-compose.yml 2>/dev/null",
            "export AWS_DEFAULT_REGION=us-east-1",
            "sudo -E aws ecr get-login-password | sudo docker login --username AWS --password-stdin 982534388133.dkr.ecr.us-east-1.amazonaws.com",
            "sudo docker compose pull backend",
            "sudo docker compose up -d --build"
        ]
    }
}
with open("fix_disk.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_disk.json", "--region", "us-east-1", "--output", "json"])
print("Pruning and deploying initiated...")
