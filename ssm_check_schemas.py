import json, subprocess, time

# This python script runs INSIDE the orbe_backend container.
# It uses the container's environment variables and database engine.
container_script = """
import sys
sys.path.append('.')
try:
    from database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        res = conn.execute(text("SELECT schema_name FROM information_schema.schemata;")).fetchall()
        schemas = [row[0] for row in res]
        print("REAL SCHEMAS:", schemas)
except Exception as e:
    print("ERROR:", e)
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            f"sudo docker exec orbe_backend python3 -c \"{container_script}\""
        ]
    }
}
with open("ssm_check_schemas.json", "w", encoding="utf-8") as f: json.dump(payload, f)

res = subprocess.check_output(
    ["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_check_schemas.json", "--region", "us-east-1", "--output", "json"],
    text=True
)
cmd_id = json.loads(res)["Command"]["CommandId"]

time.sleep(10)
out = subprocess.check_output(
    f"aws ssm get-command-invocation --command-id {cmd_id} --instance-id i-058e26140671b3254 --region us-east-1 --output json",
    shell=True
)
data = json.loads(out)
print(data.get("StandardOutputContent", data.get("StandardErrorContent", "No output")))
