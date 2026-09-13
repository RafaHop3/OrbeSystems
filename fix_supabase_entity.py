import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

shell_code = """
import asyncio
import asyncpg

async def run():
    try:
        conn = await asyncpg.connect('postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres')
        
        try:
            await conn.execute("ALTER TABLE inho.audit_logs ALTER COLUMN entity_id TYPE uuid USING NULLIF(entity_id, '')::uuid;")
        except Exception as e: print("Fail inho entity_id:", e)
        
        try:
            await conn.execute("ALTER TABLE public.audit_logs ALTER COLUMN entity_id TYPE uuid USING NULLIF(entity_id, '')::uuid;")
        except Exception as e: print("Fail public entity_id:", e)

        await conn.close()
        print("MIGRATION COMPLETE")
    except Exception as e:
        print("EXCEPTION:", e)

asyncio.run(run())
"""

commands = [
    f"cat << 'EOF' > /home/ubuntu/fix_supabase_entity.py\n{shell_code}\nEOF",
    "sudo docker exec -i inho_backend python < /home/ubuntu/fix_supabase_entity.py 2>&1"
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
    
    with open("supabase_entity_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO supabase_entity_out.txt")
    break
