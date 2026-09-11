import asyncio
import httpx

async def run_test():
    payload = {
        "name": "Teste Subagent Final",
        "document": "8565852155",
        "email": "rafael@orbesystems.com.br",
        "phone": "5551984743957",
        "category": "CUSTOMER",
        "person_type": "FISICA",
        "nis": "Cadastro Social",
        "correios_matricula": "BR101340",
        "municipal_registration": "",
        "notes": ""
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post("http://localhost:8000/api/v1/crm/contacts/", json=payload, headers={"Authorization": "Bearer dev-bypass"})
            with open("fatal_trace.txt", "w", encoding="utf-8") as f:
                f.write(f"Status: {resp.status_code}\n")
                f.write(f"Response: {resp.text}\n")
    except Exception as e:
        import traceback
        with open("fatal_trace.txt", "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(run_test())
