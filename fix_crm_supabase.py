import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

shell_code = """
import asyncio
import asyncpg

async def run():
    print("STARTING PUBLIC SCHEMA MIGRATION")
    try:
        conn = await asyncpg.connect('postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres')
        
        queries = [
           "ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS category VARCHAR(50);",
           "ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS municipal_registration VARCHAR(50);",
           "ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS state_registration VARCHAR(50);",
           "ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);",
           "ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS cashflow_horizon_months INTEGER DEFAULT 6;",
           
           "ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS business_id VARCHAR(36);",
           "ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS person_type VARCHAR(50);",
           "ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS municipal_registration VARCHAR(50);",
           "ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS state_registration VARCHAR(50);",
           "ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS website VARCHAR(255);",
           "ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150);",
           "ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS nis VARCHAR(30);",
           "ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS correios_matricula VARCHAR(50);"
        ]
        
        for q in queries:
            try:
                await conn.execute(q)
                print(f"OK: {q}")
            except Exception as e:
                print(f"ERROR on {q}: {e}")
                
        await conn.close()
        print("MIGRATION FINISHED")
    except Exception as e:
        print("EXCEPTION CONNECTING TO DB:", e)

asyncio.run(run())
"""

commands = [
    f"cat << 'EOF' > /home/ubuntu/fix_public.py\n{shell_code}\nEOF",
    "sudo docker exec -i inho_backend python < /home/ubuntu/fix_public.py"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)
command_id = response['Command']['CommandId']
print("Command sent:", command_id)
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
