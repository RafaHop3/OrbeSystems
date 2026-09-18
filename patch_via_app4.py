import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

shell_code = """
import sys
sys.path.append("/app")
import asyncio
from db.session import engine, Base
import models.models # Ensure metadata knows the tables

async def run():
    print("INSIDE APP PATCH: CREATE_ALL")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("CREATE_ALL OK")
    except Exception as e:
        print("EXCEPTION CONNECTING:", e)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
"""

commands = [
    f"cat << 'EOF' > /home/ubuntu/patch_via_app4.py\n{shell_code}\nEOF",
    "sudo docker cp /home/ubuntu/patch_via_app4.py inho_backend:/app/patch_via_app4.py",
    "sudo docker exec inho_backend python /app/patch_via_app4.py 2>&1"
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
    print("SSM OUTPUT:")
    print(out_text)
    break
