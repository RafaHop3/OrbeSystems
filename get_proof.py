import subprocess
import json
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -c \"SELECT id, status, target_broker, created_at FROM public.optout_requests WHERE id::text LIKE '2525fb0a%' OR id::text LIKE '8c46bd66%';\""
        ]
    }
}
with open("ssm_get_proof.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_get_proof.json", "--region", "us-east-1", "--output", "json"], text=True)
cmd_id = json.loads(res)["Command"]["CommandId"]

time.sleep(3)
res2 = subprocess.check_output(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], text=True)
with open("proof_out.json", "w") as f:
    f.write(res2)
