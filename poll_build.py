import subprocess, json, time

for i in range(30):
    res = subprocess.check_output(["aws", "ssm", "list-command-invocations", "--instance-id", "i-058e26140671b3254", "--max-items", "1", "--details", "--output", "json"], text=True)
    inv = json.loads(res)["CommandInvocations"][0]
    status = inv["Status"]
    if status in ["Pending", "InProgress"]:
        time.sleep(5)
    else:
        print(f"Final Status: {status}")
        out = inv.get("CommandPlugins", [{}])[0].get("Output", "")
        print(out[-1000:])
        break
