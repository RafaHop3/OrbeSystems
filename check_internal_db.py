import boto3, time

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

commands = [
    "CONTAINER=$(docker ps -qf 'name=backend' -f 'status=running' | head -n 1)",
    "docker exec $CONTAINER python -c '",
    "import psycopg2; import os;",
    "DB = os.environ.get(\"DATABASE_URL\");",
    "DB = DB.replace(\"postgresql+psycopg2\", \"postgresql\");",
    "conn = psycopg2.connect(DB); cursor = conn.cursor();",
    "cursor.execute(\"\"\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \\\"users\\\";\"\"\");",
    "for row in cursor.fetchall(): print(row)",
    "'"
]

response = ssm.send_command(
    InstanceIds=[instance_id], DocumentName="AWS-RunShellScript", Parameters={'commands': commands}
)

time.sleep(10)
output = ssm.get_command_invocation(CommandId=response['Command']['CommandId'], InstanceId=instance_id)

with open('local_db_schema.txt', 'w') as f:
    f.write(output.get('StandardOutputContent', ''))
    f.write(output.get('StandardErrorContent', ''))
