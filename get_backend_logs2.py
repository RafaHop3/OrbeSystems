import subprocess
import json
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo docker logs --tail 200 orbe_backend 2> /tmp/err_logs.txt 1> /tmp/out_logs.txt",
            "cat /tmp/err_logs.txt"
        ]
    }
}
with open("ssm_get_full_logs.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_get_full_logs.json", "--region", "us-east-1", "--output", "json"], text=True)
cmd_id = json.loads(res)["Command"]["CommandId"]

time.sleep(4)
res2 = subprocess.check_output(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], text=True)
with open("backend_full_logs.json", "w") as f:
    f.write(res2)
