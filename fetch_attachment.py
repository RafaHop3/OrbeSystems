import subprocess
import json

response = subprocess.check_output(["curl.exe", "-s", "https://ntfy.sh/orbe-rafael-logs-12345/json?poll=1"]).decode("utf-8")
for line in response.strip().split('\n'):
    if line:
        try:
            data = json.loads(line)
            if 'attachment' in data:
                url = data['attachment']['url']
                content = subprocess.check_output(["curl.exe", "-s", url]).decode("utf-8")
                print("======== ATTACHMENT CONTENT ========")
                print(content)
        except Exception as e:
            print("Error ", e)
