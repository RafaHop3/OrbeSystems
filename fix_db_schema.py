import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

sql = """
ALTER TABLE inho.audit_logs ALTER COLUMN id TYPE VARCHAR(36);
ALTER TABLE inho.audit_logs ALTER COLUMN business_id TYPE VARCHAR(36);
ALTER TABLE inho.audit_logs ALTER COLUMN user_id TYPE VARCHAR(36);
ALTER TABLE inho.audit_logs ALTER COLUMN entity_id TYPE VARCHAR(255);
"""

commands = [
    f"sudo docker exec -i orbe_postgres psql -U postgres -d orbe_db -c \"{sql}\" 2>&1"
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
    
    with open("fix_db_out.txt", "w", encoding="utf-8") as f:
        f.write(out_text)
    print("SAVED TO fix_db_out.txt")
    break
