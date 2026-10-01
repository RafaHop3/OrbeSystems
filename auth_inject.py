import subprocess

code = "4/0AXlqoi5H8PyyxKKFXYs-KU4eNVptHnbJODmvV65IekJiujXEWt6QT6Lg4FEU2mx3YynwfA"
cmd = [r"C:\Users\rafae\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd", "auth", "login", "--no-launch-browser"]
res = subprocess.run(cmd, input=code.encode('utf-8') + b"\n", capture_output=True)
print("STDOUT:", res.stdout.decode('utf-8', errors='ignore'))
print("STDERR:", res.stderr.decode('utf-8', errors='ignore'))
