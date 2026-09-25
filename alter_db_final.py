import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

sql = """
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

ALTER TABLE users ALTER COLUMN id TYPE VARCHAR USING id::varchar;
ALTER TABLE user_roles ALTER COLUMN user_id TYPE VARCHAR USING user_id::varchar;
ALTER TABLE user_subscriptions ALTER COLUMN user_id TYPE VARCHAR USING user_id::varchar;

ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
"""

commands = [
    f"docker exec orbe_postgres psql -U orbe_admin -d orbesystems -c \"{sql}\""
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)

time.sleep(10)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('alter_output_final.txt', 'w') as f:
    f.write(output.get('StandardOutputContent', ''))
    f.write(output.get('StandardErrorContent', ''))
