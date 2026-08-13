import subprocess
import json
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": ["cat /tmp/mock.log"]
    }
}
with open("ssm_get_mock_log.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_get_mock_log.json", "--region", "us-east-1", "--output", "json"], text=True)
cmd_id = json.loads(res)["Command"]["CommandId"]

for i in range(5):
    time.sleep(3)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data_text = out.stdout.decode('utf-8', errors='replace')
        try:
            data = json.loads(data_text)
            if data.get("Status") in ["Success", "Failed"]:
                print(data.get("StandardOutputContent", ""))
                import sys
                print(data.get("StandardErrorContent", ""), file=sys.stderr)
                break
        except Exception:
            pass
