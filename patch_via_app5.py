import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

shell_code = """
import sys
sys.path.append("/app")
import asyncio
from db.session import engine
from sqlalchemy import text

async def run():
    print("INSIDE APP PATCH SCRIPT AUTOCOMMIT 4 ALTER ENUMS")
    try:
        async with engine.connect() as conn:
            await conn.execution_options(isolation_level="AUTOCOMMIT")
            queries = [
               "ALTER TYPE public.persontype ADD VALUE IF NOT EXISTS 'INDIVIDUAL';",
               "ALTER TYPE public.persontype ADD VALUE IF NOT EXISTS 'LEGAL_ENTITY';",
               "ALTER TYPE public.persontype ADD VALUE IF NOT EXISTS 'FOREIGN';"
            ]
            for q in queries:
                try:
                    await conn.execute(text(q))
                    print(f"OK: {q}")
                except Exception as e:
                    print(f"ERROR on {q}: {e}")
            print("ENUM ALTERATION FINISHED")
    except Exception as e:
        print("EXCEPTION CONNECTING:", e)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
"""

commands = [
    f"cat << 'EOF' > /home/ubuntu/patch_via_app5.py\n{shell_code}\nEOF",
    "sudo docker cp /home/ubuntu/patch_via_app5.py inho_backend:/app/patch_via_app5.py",
    "sudo docker exec inho_backend python /app/patch_via_app5.py 2>&1"
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
