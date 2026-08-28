import subprocess, json

out = subprocess.run(['aws', 'ssm', 'get-command-invocation', '--command-id', 'a5b948be-9414-41a3-b56a-6ebbc37935fe', '--instance-id', 'i-058e26140671b3254', '--output', 'json'], capture_output=True)
data = json.loads(out.stdout.decode('utf-8'))
with open('d:/OrbeSystems/orbe-systems/env_dump.txt', 'w', encoding='utf-8') as f:
    f.write(data.get('StandardOutputContent', ''))
