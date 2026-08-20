import subprocess, json
out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", "5d3ca38a-2115-4abe-ae9b-d8209ff75c44", "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
data = json.loads(out.stdout.decode('utf-8'))
with open("ssm_error.txt", "w", encoding="utf-8") as f:
    f.write("OUT:\n" + data.get("StandardOutputContent", "") + "\nERR:\n" + data.get("StandardErrorContent", ""))
