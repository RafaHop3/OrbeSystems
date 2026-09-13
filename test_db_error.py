import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

shell_code = """
import asyncio
from db.session import get_db
from models.models import AuditLog, AuditAction

async def test_audit():
    try:
        async for db in get_db():
            log = AuditLog(
                action=AuditAction.FAILED_LOGIN,
                entity="Auth",
                ip_address="127.0.0.1"
            )
            db.add(log)
            try:
                await db.flush()
                print("OK")
            except Exception as e:
                import traceback
                print("--- TRACEBACK ---")
                traceback.print_exc()
            break
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test_audit())
"""

commands = [
    f"cat << 'EOF' > /home/ubuntu/test_audit_db.py\n{shell_code}\nEOF",
    "sudo docker exec -i inho_backend python < /home/ubuntu/test_audit_db.py 2>&1"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']

while True:
    time.sleep(3)
    out = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if not out['CommandInvocations']: continue
    status = out['CommandInvocations'][0]['Status']
    if status in ['Pending', 'InProgress']: continue
    plugin = out['CommandInvocations'][0]['CommandPlugins'][0]
    out_text = plugin.get('Output', 'No output.')
    
    with open("audit_db_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO audit_db_out.txt")
    break
