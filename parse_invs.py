import subprocess
import json

try:
    out = subprocess.check_output([
        "aws", "ssm", "list-command-invocations",
        "--instance-id", "i-058e26140671b3254",
        "--details", "--output", "json"
    ]).decode('utf-8', errors='ignore')
except Exception as e:
    print(f"Error fetching AWS list: {e}")
    exit(1)

try:
    data = json.loads(out)
except BaseException as e:
    print(f"FAILED TO PARSE JSON: {e}")
    exit(1)

invs = data.get("CommandInvocations", [])
if not invs:
    print("NO INVOCATIONS")
    exit(1)

# Sort by RequestedDateTime descending
invs.sort(key=lambda x: x.get("RequestedDateTime", ""), reverse=True)
for i, inv in enumerate(invs):
    if "CommandPlugins" in inv and len(inv["CommandPlugins"]) > 0:
        out_txt = inv["CommandPlugins"][0].get("Output", "")
        if "level=warning" in out_txt and len(out_txt) < 350:
            continue
        print(f"[{i}] {inv.get('RequestedDateTime')} -> {inv.get('Status')} ")
        print("LATEST MEANINGFUL LOG:\n", out_txt[:1500])
        break
