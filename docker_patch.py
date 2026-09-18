import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

sql = """
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS municipal_registration VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS state_registration VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cashflow_horizon_months INTEGER DEFAULT 6;

ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS business_id VARCHAR(36);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS person_type VARCHAR(50);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS municipal_registration VARCHAR(50);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS state_registration VARCHAR(50);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS nis VARCHAR(30);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS correios_matricula VARCHAR(50);
"""

commands = [
    f"cat << 'EOF' > /home/ubuntu/patch.sql\n{sql}\nEOF",
    "sudo docker run --rm --network orbesystems_default -e PGPASSWORD='OrbeSystems123!' -v /home/ubuntu/patch.sql:/patch.sql postgres:15 psql -h orbe_postgres -U postgres -d orbesystemsprod -a -f /patch.sql 2>&1"
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
