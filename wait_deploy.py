import time, json, subprocess
cmd_id = "cf5b4089-768d-45fd-b7c5-28d67624b109"
print("Waiting for deployment to complete...")
while True:
    out = subprocess.check_output(f"aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json", shell=True)
    res = json.loads(out)
    if res.get("Status") in ["Success", "Failed", "Cancelled", "TimedOut"]:
        print(f"Deploy ended with Status: {res.get('Status')}")
        break
    time.sleep(10)
