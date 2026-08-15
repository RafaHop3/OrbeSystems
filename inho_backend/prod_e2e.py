import asyncio
import httpx

async def run_e2e_test():
    base_url = "https://api.orbesystems.com.br"
    print(f"Connecting to LIVE production endpoint: {base_url}")
    async with httpx.AsyncClient(base_url=base_url, timeout=10.0) as client:
        print("1. Testing Health Check...")
        r = await client.get("/health")
        print("   Health:", r.status_code, r.text)
        assert r.status_code == 200

        print("2. Registering Cooperativa Habitacional user...")
        import uuid
        email = f"coop.{uuid.uuid4().hex[:6]}@solnascente.coop.br"
        r = await client.post("/api/v1/auth/register", json={
            "email": email,
            "full_name": "Cooperativa Habitacional Sol Nascente",
            "password": "SecurePass123!"
        })
        print("   Register status:", r.status_code, r.text)
        assert r.status_code in [201, 400] # 400 if user exists, etc.

        print("3. Logging in...")
        r = await client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "SecurePass123!"
        })
        print("   Login status:", r.status_code, r.text)
        assert r.status_code == 200
        token_data = r.json()
        token = token_data.get("access_token")
        assert token is not None

        headers = {"Authorization": f"Bearer {token}"}

        print("4. Fetching /users/me profile...")
        r = await client.get("/api/v1/users/me", headers=headers)
        print("   Users /me:", r.status_code, r.text)
        assert r.status_code == 200

        print("\n🎉 ALL E2E API VERIFICATION STEPS PASSED 100% IN PRODUCTION!")

if __name__ == "__main__":
    import traceback
    try:
        asyncio.run(run_e2e_test())
    except Exception as e:
        traceback.print_exc()
