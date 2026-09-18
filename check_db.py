import boto3, time
ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

shell_code = """
import asyncio
import asyncpg

async def run():
    try:
        conn = await asyncpg.connect('postgresql://postgres:OrbeSystems123!@orbesystems_postgres:5432/orbesystemsprod')
        r = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses';")
        print("COLUMNS:", [x['column_name'] for x in r])
        await conn.close()
    except Exception as e:
        print("ERROR:", e)

asyncio.run(run())
"""
commands = [
    f"cat << 'EOF' > /home/ubuntu/check_db.py\n{shell_code}\nEOF",
    "sudo docker exec -i inho_backend python /home/ubuntu/check_db.py"
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
    print("SSM OUTPUT:", out_text)
    break
