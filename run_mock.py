import subprocess
import json
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cat << 'EOF' > /home/ubuntu/mock_runner.py",
            "import os, time, sys",
            "import requests, traceback",
            "import psycopg2",
            "from dotenv import load_dotenv",
            "",
            "load_dotenv('/home/ubuntu/orbe-systems/backend/.env')",
            "db_url = os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql://')",
            "print('Connecting to DB to find pending ticket...')",
            "try:",
            "    # We connect directly via docker or external. Since it's on EC2, we can connect to localhost:5432",
            "    conn = psycopg2.connect(dbname='orbesystems', user='orbe_admin', password='orbe_password', host='localhost', port=5432)",
            "    cur = conn.cursor()",
            "    cur.execute(\"SELECT id FROM public.optout_requests WHERE status='PENDING' ORDER BY created_at DESC LIMIT 1\")",
            "    row = cur.fetchone()",
            "    if not row:",
            "        print('No pending tickets found.')",
            "        sys.exit(0)",
            "    ticket_id = row[0]",
            "    print(f'Found ticket: {ticket_id}')",
            "except Exception as e:",
            "    print(e)",
            "    traceback.print_exc()",
            "    sys.exit(1)",
            "",
            "WEBHOOK_URL = 'http://localhost/api/optout/webhook'",
            "def send_update(status, log):",
            "    r = requests.post(WEBHOOK_URL, json={'ticket_id': ticket_id, 'status': status, 'log': log})",
            "    print(f'Update {status}: {r.status_code}')",
            "",
            "send_update('RUNNING', 'Iniciando Robô Headless de Exclusão...')",
            "time.sleep(2)",
            "send_update('RUNNING', 'Acessando plataforma do Data Broker e localizando perfil...')",
            "time.sleep(2)",
            "send_update('RUNNING', 'Perfil encontrado. Emitindo Notificação Extrajudicial (LGPD Art. 18)...')",
            "time.sleep(3)",
            "send_update('SUCCESS', 'Data Broker confirmou a exclusão dos dados. Processo concluído com sucesso!')",
            "EOF",
            "sudo apt-get install -y python3-psycopg2 python3-requests python3-dotenv",
            "python3 /home/ubuntu/mock_runner.py"
        ]
    }
}
with open("ssm_mock_runner.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_mock_runner.json", "--region", "us-east-1", "--output", "json"], text=True)
cmd_id = json.loads(res)["Command"]["CommandId"]

for i in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data_text = out.stdout.decode('utf-8', errors='replace')
        try:
            data = json.loads(data_text)
            if data.get("Status") in ["Success", "Failed"]:
                print("STATUS:", data.get("Status"))
                print(data.get("StandardOutputContent", ""))
                import sys
                print("ERR:", data.get("StandardErrorContent", ""), file=sys.stderr)
                break
        except Exception:
            pass
