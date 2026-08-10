import subprocess
try:
    res = subprocess.check_output("aws login --region us-east-1", shell=True, stderr=subprocess.STDOUT)
    print(res.decode('utf-8'))
except subprocess.CalledProcessError as e:
    print(f"FAILED {e.returncode}: {e.output.decode('utf-8')}")
