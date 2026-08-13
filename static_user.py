import requests, json, subprocess
email = "bot_verificador_final@orbesystems.com.br"
pwd = "OrbePassword99!"

res = requests.post("https://api.orbesystems.com.br/api/users/register", json={"email": email, "password": pwd})
print(res.text)

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
subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_promo.json", "--region", "us-east-1", "--output", "json"], text=True)
print("USER READY!")
