import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

shell_code = """
import asyncio
import asyncpg

async def run():
    try:
        conn = await asyncpg.connect('postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres')
        await conn.execute("ALTER TABLE inho.audit_logs ALTER COLUMN id TYPE VARCHAR(36);")
        await conn.execute("ALTER TABLE inho.audit_logs ALTER COLUMN business_id TYPE VARCHAR(36);")
        await conn.execute("ALTER TABLE inho.audit_logs ALTER COLUMN user_id TYPE VARCHAR(36);")
        await conn.execute("ALTER TABLE inho.audit_logs ALTER COLUMN entity_id TYPE VARCHAR(255);")
        await conn.close()
        print("MIGRATION OK")
    except Exception as e:
        print("EXCEPTION:", e)

asyncio.run(run())
"""

commands = [
    f"cat << 'EOF' > /home/ubuntu/fix_supabase.py\n{shell_code}\nEOF",
    "sudo docker exec -i inho_backend python < /home/ubuntu/fix_supabase.py"
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
    
    with open("supabase_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO supabase_out.txt")
    break
