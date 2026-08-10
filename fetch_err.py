import json, subprocess
import sys

cmd_id = "b9277aba-290f-4d39-b495-217e6d10603b"
out = subprocess.check_output(
    f"aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json",
    shell=True
)
data = json.loads(out.decode('utf-8', errors='replace'))
with open("ssm_error_clean.txt", "w", encoding="utf-8") as f:
    f.write("=== ERR ===\n")
    f.write(data.get("StandardErrorContent", ""))
    f.write("\n=== OUT ===\n")
    f.write(data.get("StandardOutputContent", ""))
