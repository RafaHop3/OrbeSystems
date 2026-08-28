import subprocess, json

py_script = """
import psycopg2

db_url = "postgresql://postgres:Muhammadalivsroyjonesjr@db.zgdtyzaxoqziroqjqgni.supabase.co:5432/postgres?sslmode=require"
try:
    print("Connecting to Supabase natively from EC2 host...")
    conn = psycopg2.connect(db_url, connect_timeout=15)
    curr = conn.cursor()
    curr.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT 'OrbeAdmin' NOT NULL;")
    conn.commit()
    print("SUCCESS: full_name column added securely to public.users on LIVE cluster!")
    conn.close()
except Exception as e:
    import traceback
    print("ERR:", traceback.format_exc())
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [{"Key": "InstanceIds", "Values": ["i-058e26140671b3254"]}],
    "Parameters": {
        "commands": [
            "sudo apt-get update -y",
            "sudo apt-get install -y python3-psycopg2",
            "cat << 'EOF' > /home/ubuntu/native_fix.py\n" + py_script.replace('$', '\\$') + "\nEOF",
            "python3 /home/ubuntu/native_fix.py"
        ]
    }
}

with open("fix_db_native.json", "w") as f:
    json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://fix_db_native.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

import time
import sys
for _ in range(20):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode("utf-8", errors="replace"))
        if data.get("Status") in ["Success", "Failed"]:
            status = data.get("Status")
            print("StandardOutputContent:")
            print(data.get("StandardOutputContent"))
            print("StandardErrorContent:")
            print(data.get("StandardErrorContent"))
            sys.exit(0 if status == 'Success' else 1)

print("Timeout waiting")
sys.exit(1)
