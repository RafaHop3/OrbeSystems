import subprocess, sys, time, json

cmd_id = sys.argv[1].strip()

print(f"Polling {cmd_id} for completion (up to 5 mins)...")
for i in range(60):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        status = data.get("Status")
        print(f"[{i}] Status: {status}")
        if status in ["Success", "Failed"]:
            print("--- STDOUT ---")
            print(data.get("StandardOutputContent", ""))
            print("--- STDERR ---")
            print(data.get("StandardErrorContent", ""))
            sys.exit(0 if status == "Success" else 1)
print("Timeout")
sys.exit(1)
