import requests, random, json, subprocess, time
email = f"robo_tester_{random.randint(10,999)}@orbesystems.com.br"
pwd = "SubagentPassword123!"

res = requests.post("https://api.orbesystems.com.br/api/users/register", json={"email": email, "password": pwd})
print("REGISTER:", res.status_code, res.text)

print("PROMOTING...")
payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            f"sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -t -c \"UPDATE users SET role='premium' WHERE email='{email}';\""
        ]
    }
}
with open("ssm_promo.json", "w") as f: json.dump(payload, f)
sp = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_promo.json", "--region", "us-east-1", "--output", "json"], text=True)
time.sleep(10)
print(f"DONE! Credentials: {email} / {pwd}")
