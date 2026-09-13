import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

shell_code = """
import asyncio
import asyncpg

async def run():
    conn = await asyncpg.connect('postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres')
    r = await conn.fetch("SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema IN ('inho', 'public') AND table_name IN ('users', 'businesses', 'audit_logs') AND column_name='id';")
    for row in r: print(dict(row))
    await conn.close()

asyncio.run(run())
"""

commands = [
    f"cat << 'EOF' > /home/ubuntu/check_supabase.py\n{shell_code}\nEOF",
    "sudo docker exec -i inho_backend python < /home/ubuntu/check_supabase.py"
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
    
    with open("supabase_types_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO supabase_types_out.txt")
    break
