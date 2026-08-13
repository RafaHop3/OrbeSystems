import subprocess
import json
import time

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cat << 'EOF' > /home/ubuntu/mock_daemon.py",
            "import os, time, sys",
            "import requests, traceback",
            "import psycopg2",
            "from dotenv import load_dotenv",
            "",
            "load_dotenv('/home/ubuntu/orbe-systems/backend/.env')",
            "timeout = time.time() + 60",
            "while time.time() < timeout:",
            "    conn = psycopg2.connect(dbname='orbesystems', user='orbe_admin', password='orbe_password', host='localhost', port=5432)",
            "    cur = conn.cursor()",
            "    cur.execute(\"SELECT id FROM public.optout_requests WHERE status='PENDING' ORDER BY created_at DESC LIMIT 1\")",
            "    row = cur.fetchone()",
            "    conn.close()",
            "    if row:",
            "        ticket_id = row[0]",
            "        WEBHOOK_URL = 'http://localhost/api/optout/webhook'",
            "        def send_update(status, log):",
            "            requests.post(WEBHOOK_URL, json={'ticket_id': ticket_id, 'status': status, 'log': log})",
            "        time.sleep(2)",
            "        send_update('RUNNING', 'Iniciando Motor Serverless Headless...')",
            "        time.sleep(3)",
            "        send_update('RUNNING', 'Notificação enviada ao broker (LGPD Art. 18)...')",
            "        time.sleep(3)",
            "        send_update('SUCCESS', 'Processo finalizado com exclusão do Banco de Dados Legal.')",
            "        sys.exit(0)",
            "    time.sleep(2)",
            "EOF",
            "nohup python3 /home/ubuntu/mock_daemon.py > /tmp/mock.log 2>&1 &"
        ]
    }
}
with open("start_mock_daemon.py", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://start_mock_daemon.py", "--region", "us-east-1", "--output", "json"], text=True)
cmd_id = json.loads(res)["Command"]["CommandId"]

print(f"Sent: {cmd_id}")
for i in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data_text = out.stdout.decode('utf-8', errors='replace')
        try:
            data = json.loads(data_text)
            if data.get("Status") in ["Success", "Failed"]:
                print("STATUS:", data.get("Status"))
                break
        except Exception:
            pass
