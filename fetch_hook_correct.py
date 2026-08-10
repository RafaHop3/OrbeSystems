import subprocess
import json

response = subprocess.check_output(["curl.exe", "-s", "https://ntfy.sh/orbe-rafael-logs-12345/json?poll=1"]).decode("utf-8")
for line in response.strip().split('\n'):
    if line:
        try:
            data = json.loads(line)
            if 'message' in data:
                print("======== MESSAGE ========")
                print(data['message'])
        except Exception as e:
            pass
