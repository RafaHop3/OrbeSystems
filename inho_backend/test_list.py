import asyncio
import httpx

async def test_list():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8001") as client:
        # Login first
        email = "test_colab_1786883014@orbe.com"
        r = await client.post("/api/v1/auth/login", json={"email": email, "password": "SecurePass123!"})
        print("Login:", r.status_code, r.json())
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test list
        r = await client.get("/api/v1/billing/", headers=headers)
        print("List:", r.status_code)
        print("Body:", r.text)

asyncio.run(test_list())