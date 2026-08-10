import subprocess
import json
import time

time.sleep(20) # Aguarda EC2 rodar o prune e baixar o Docker

try:
    response = subprocess.check_output(["curl.exe", "-s", "https://ntfy.sh/orbe-rafael-logs-12345/json?poll=1"]).decode("utf-8")
    for line in response.strip().split('\n'):
        if line:
            data = json.loads(line)
            if 'message' in data and "SYSTEM REBOOT" in data['message']:
                print("\n######################################")
                print("#  SUCESSO ABSOLUTO NA AMAZON AWS!!! #")
                print("######################################\n")
                print("Message:", data['message'])
except Exception as e:
    print(f"Error fetching hook: {e}")
