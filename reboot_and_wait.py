import subprocess, time, sys

print("Rebooting instance...")
subprocess.run(["aws", "ec2", "reboot-instances", "--instance-ids", "i-058e26140671b3254", "--region", "us-east-1"])
print("Waiting for instance to restart logic...")
for _ in range(4):
    time.sleep(5)

print("Waiting for SSM to report connected...")
for _ in range(40):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-connection-status", "--target", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if b'"connected"' in out.stdout.lower():
        print("Instance is back online and SSM is ready!")
        sys.exit(0)
print("Timeout waiting for instance.")
sys.exit(1)
