import subprocess
import json
import base64
import time
import sys

# Get the latest SSM ID
output = subprocess.check_output([
    "aws", "ssm", "list-command-invocations",
    "--instance-id", "i-058e26140671b3254",
    "--max-items", "1",
    "--details", "--output", "json"
]).decode('utf-8')

data = json.loads(output)
invocations = data.get("CommandInvocations", [])
if not invocations:
    print("No invocations found.")
    sys.exit(1)

cmd = invocations[0]
status = cmd.get("Status")
if status == "Pending" or status == "InProgress":
    print("Command is still running...")
    sys.exit(0)

output_str = cmd["CommandPlugins"][0].get("Output", "")
raw_b64 = output_str.strip()

# Safely extract only b64 characters just in case aws injected warning headers
clean_b64 = "".join([c for c in raw_b64 if c.isalnum() or c in "+/="])

# Pad correctly if needed
missing_padding = len(clean_b64) % 4
if missing_padding:
    clean_b64 += '=' * (4 - missing_padding)

try:
    decoded_bytes = base64.b64decode(clean_b64)
    decoded = decoded_bytes.decode('utf-8', errors='replace')
    with open("backend_crash.log", "w", encoding="utf-8") as f:
        f.write(decoded)
    print("SUCCESS: LOG DECODED")
except Exception as e:
    print(f"FAILED TO DECODE: {e}")
