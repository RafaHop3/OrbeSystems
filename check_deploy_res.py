import json, subprocess
cmd_id = "cf5b4089-768d-45fd-b7c5-28d67624b109"

out = subprocess.check_output(
    f"aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json",
    shell=True
)
data = json.loads(out)
print("--- OUTPUT ---")
print(data.get("StandardOutputContent", ""))
print("--- ERROR ---")
print(data.get("StandardErrorContent", ""))
