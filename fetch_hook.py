import subprocess
import json
import time

time.sleep(20) # Aguarda EC2 compilar o erro e chutar pro HTTP
try:
    response = subprocess.check_output(["curl.exe", "-s", "https://ntfy.sh/orbe-rafael-logs-12346/json?poll=1"]).decode("utf-8")
    for line in response.strip().split('\n'):
        if line:
            data = json.loads(line)
            if 'message' in data:
                print("RAW BUILD EXCEPTION FROM AWS:\n")
                print(data['message'])
except Exception as e:
    print(f"Error fetching hook: {e}")
