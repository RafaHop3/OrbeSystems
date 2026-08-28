import subprocess, json, time, sys

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "cat /home/ubuntu/orbe-systems/backend/.env"
        ]
    }
}

with open("get_env2_req.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output('aws ssm send-command --cli-input-json file://get_env2_req.json --region us-east-1 --output json', shell=True)
cmd_id = json.loads(res)["Command"]["CommandId"]

for _ in range(15):
    time.sleep(5)
    out = subprocess.run(f'aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json', shell=True, capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            with open("d:\\OrbeSystems\\orbe-systems\\ec2_env.txt", "w", encoding="utf-8") as f:
                f.write(data.get("StandardOutputContent", ""))
            print("Successfully extracted .env to local ec2_env.txt")
            sys.exit(0)

print("Timeout waiting")
sys.exit(1)
