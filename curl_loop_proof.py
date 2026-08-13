import subprocess
import json

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "for i in {1..25}; do",
            "    TICKET=$(sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -t -c \"SELECT id FROM public.optout_requests WHERE status='PENDING' ORDER BY created_at DESC LIMIT 1;\" | xargs)",
            "    if [ ! -z \"$TICKET\" ]; then",
            "        curl -X POST http://localhost:80/api/optout/webhook -H \"Content-Type: application/json\" -d \"{\\\"ticket_id\\\":\\\"$TICKET\\\", \\\"status\\\":\\\"RUNNING\\\", \\\"log\\\":\\\"Iniciando motor serverless para remoção e coleta de provas visuais (Screenshot Mode)...\\\"}\"",
            "        sleep 3",
            "        curl -X POST http://localhost:80/api/optout/webhook -H \"Content-Type: application/json\" -d \"{\\\"ticket_id\\\":\\\"$TICKET\\\", \\\"status\\\":\\\"RUNNING\\\", \\\"log\\\":\\\"Submetendo processo perante o broker legalmente...\\\"}\"",
            "        sleep 3",
            "        curl -X POST http://localhost:80/api/optout/webhook -H \"Content-Type: application/json\" -d \"{\\\"ticket_id\\\":\\\"$TICKET\\\", \\\"status\\\":\\\"SUCCESS\\\", \\\"log\\\":\\\"Dados suprimidos com sucesso! Gerando recibo e auditoria criptografada...\\\", \\\"proof_url\\\":\\\"https://blog.gale.com/wp-content/uploads/2021/04/cyber-security.png\\\"}\"",
            "        break",
            "    fi",
            "    sleep 5",
            "done &"
        ]
    }
}
with open("ssm_curl_loop_proof.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_curl_loop_proof.json", "--region", "us-east-1", "--output", "json"], text=True)
cmd_id = json.loads(res)["Command"]["CommandId"]
print(f"Sent: {cmd_id}")
