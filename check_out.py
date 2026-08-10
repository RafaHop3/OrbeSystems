import subprocess, json
try:
    res = subprocess.check_output(["aws", "ssm", "list-command-invocations", "--instance-id", "i-058e26140671b3254", "--max-items", "1", "--details", "--output", "json"], text=True)
    inv = json.loads(res)["CommandInvocations"][0]
    out = inv.get("CommandPlugins", [{}])[0].get("Output", "")
    print(out[-1500:])
except Exception as e:
    print(f"Error: {e}")
