import base64
import subprocess, json, time, sys

test_script = """
import asyncio
import httpx
import uuid
from datetime import datetime, timezone, timedelta
from db.session import engine
from models.models import Business, Cooperado, CooperadoStatus, BillingInvoice, BillingStatus, InvoiceType, WebhookLog
from sqlalchemy import select

async def run_fsm_e2e():
    print("--- STARTING FSM E2E VERIFICATION ---")
    mock_doc = '99988877766'
    
    async with engine.begin() as conn:
        from core.security import hash_password
        
        # 1. Obter o Business padrao
        res = await conn.execute(select(Business).limit(1))
        biz = res.first()
        if not biz:
            print("[x] No businesses found to test.")
            return

        business_id = biz[0]

        # 2. Inserir Cooperado
        coop_id = uuid.uuid4()
        await conn.execute(Cooperado.__table__.insert().values(
            id=coop_id,
            business_id=business_id,
            name="Cooperado E2E Test",
            document=mock_doc,
            email="cooperado_e2e@inho.com",
            phone="11999999999",
            status=CooperadoStatus.PROPOSTA_CADASTRADA.value,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        ))
        
        # 3. Inserir Fatura Pendente
        inv_id = uuid.uuid4()
        await conn.execute(BillingInvoice.__table__.insert().values(
            id=inv_id,
            business_id=business_id,
            cooperado_id=coop_id,
            invoice_type=InvoiceType.INTEGRALIZACAO_INICIAL.value,
            customer_name="Cooperado E2E Test",
            customer_doc=mock_doc,
            amount=50.0,
            status=BillingStatus.PENDING.value,
            due_date=datetime.now(timezone.utc) + timedelta(days=5),
            payment_method="PIX",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        ))
        print(f"[*] Seeded Cooperado {coop_id} and Invoice {inv_id}")

    # 4. Trigger the Public Webhook via HTTP
    print("[*] Firing public Bank Webhook...")
    async with httpx.AsyncClient() as client:
        webhook_payload = {
            "event_id": str(uuid.uuid4()),
            "event": "PAYMENT_CONFIRMED",
            "document": mock_doc,
            "amount": 50.0,
            "bank_provider": "ASAAS_MOCK"
        }
        # In Docker we can just hit localhost:8000
        resp = await client.post("http://localhost:8000/api/v1/billing/webhook/bank", json=webhook_payload)
        print(f"[HTTP] Webhook response: {resp.status_code} - {resp.text}")

    # 5. Verify the State Transitions
    async with engine.begin() as conn:
        coop_res = await conn.execute(select(Cooperado).where(Cooperado.id == coop_id))
        coop = coop_res.first()
        inv_res = await conn.execute(select(BillingInvoice).where(BillingInvoice.id == inv_id))
        inv = inv_res.first()
        
        print(f"[VERIFY] Invoice Final Status: {inv[8]}") # status index in row
        
        # We find status by matching name. In sqlalchemy 2.0 Row, it can be accessed by name
        coop_map = coop._mapping
        inv_map = inv._mapping
        
        print(f"[VERIFY] Invoice _mapping Status: {inv_map['status']}")
        print(f"[VERIFY] Cooperado _mapping Status: {coop_map['status']}")
        
        if inv_map['status'] == BillingStatus.PAID.value and coop_map['status'] == CooperadoStatus.ATIVO.value:
            print("SUCCESS: FSM Executed flawlessly.")
        else:
            print("FAILED: FSM state mismatch.")

asyncio.run(run_fsm_e2e())
"""

b64_script = base64.b64encode(test_script.encode("utf-8")).decode("utf-8")

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            f"echo '{b64_script}' | base64 -d > /tmp/run_e2e_fsm.py",
            "sudo docker cp /tmp/run_e2e_fsm.py inho_backend:/app/run_e2e_fsm.py",
            "sudo docker exec inho_backend python /app/run_e2e_fsm.py"
        ]
    }
}

with open("run_fsm.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://run_fsm.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Wait E2E...", flush=True)
for _ in range(25):
    time.sleep(3)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            print(data.get("StandardOutputContent", ""))
            print("-- ERR --")
            print(data.get("StandardErrorContent", ""))
            sys.exit(0)
print("Timeout")
sys.exit(1)
