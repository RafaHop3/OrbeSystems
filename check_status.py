import subprocess, json
res = subprocess.check_output(["aws", "ssm", "list-command-invocations", "--instance-id", "i-058e26140671b3254", "--max-items", "1", "--details", "--output", "json"])
data = json.loads(res.decode('utf-8', errors='replace'))
for inv in data.get("CommandInvocations", []):
    print(inv["Status"])
    print(inv["CommandPlugins"][0].get("Output", ""))
