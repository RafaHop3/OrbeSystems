import asyncio
import uuid
import httpx

async def run_audit_verification():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        print("1. Checking backend health...")
        r = await client.get("/health")
        if r.status_code != 200:
            print("   Backend server not running on http://127.0.0.1:8000. Skipping live HTTP test.")
            return

        print("2. Registering Master Admin user...")
        email = f"admin.master.{uuid.uuid4().hex[:6]}@inho.com.br"
        r = await client.post("/api/v1/auth/register", json={
            "email": email,
            "full_name": "Usuário Mestre INHO",
            "password": "MasterPass123!"
        })
        print("   Register status:", r.status_code)
        assert r.status_code == 201

        print("3. Logging in...")
        r = await client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "MasterPass123!"
        })
        print("   Login status:", r.status_code)
        assert r.status_code == 200
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        print("4. Verifying /users/me role label...")
        r = await client.get("/api/v1/users/me", headers=headers)
        user_data = r.json()
        print("   User Profile:", user_data.get("full_name"), "| Role Label:", user_data.get("role_label"))
        assert user_data.get("role_label") is not None

        print("5. Creating Billing Invoice & checking audit metadata...")
        r = await client.post("/api/v1/billing/", json={
            "customer_name": "Empresa Teste Auditoria LTDA",
            "customer_phone": "11988887777",
            "customer_email": "financeiro@empresateste.com.br",
            "amount": 2500.0,
            "due_date": "2026-09-01T00:00:00Z",
            "description": "Serviços de Auditoria e Consultoria"
        }, headers=headers)
        print("   Create Invoice Status:", r.status_code)
        assert r.status_code == 201
        inv = r.json()
        print("   Invoice created_by_name:", inv.get("created_by_name"))
        assert inv.get("created_by_name") is not None

        print("6. Updating Invoice Status...")
        inv_id = inv["id"]
        r = await client.patch(f"/api/v1/billing/{inv_id}/status", json={"status": "PAID"}, headers=headers)
        print("   Update Status code:", r.status_code)
        assert r.status_code == 200
        updated_inv = r.json()
        print("   Invoice updated_by_name:", updated_inv.get("updated_by_name"))
        assert updated_inv.get("updated_by_name") is not None

        print("7. Fetching Audit Logs...")
        r = await client.get("/api/v1/audit/me", headers=headers)
        print("   Audit Logs count:", len(r.json()))
        assert r.status_code == 200
        logs = r.json()
        for log in logs[:3]:
            print(f"   [LOG] {log.get('timestamp')} | Action: {log.get('action')} | User: {log.get('user_name')} ({log.get('user_role')}) | Entity: {log.get('entity')}")

        print("\n✅ ALL AUDIT & USER CLASSIFICATION VERIFICATIONS PASSED!")

if __name__ == "__main__":
    asyncio.run(run_audit_verification())
