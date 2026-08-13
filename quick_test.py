import requests
BASE = "https://api.orbesystems.com.br"
try:
    r = requests.post(f"{BASE}/api/users/login", json={"email": "tester@orbesystems.com.br", "password": "Password123!"})
    r.raise_for_status()
    print("Login OK!")
    
    token = r.cookies.get("orbe_auth_token") or r.json().get("access_token")
    if not token:
        print("No token.")
        exit(1)
        
    r2 = requests.post(
        f"{BASE}/api/optout/request", 
        json={"email": "tester@orbesystems.com.br", "target_broker": "escavador"},
        headers={"Authorization": f"Bearer {token}"}
    )
    r2.raise_for_status()
    print("Optout OK:", r2.json())
except Exception as e:
    print("Test failed!", e)
    if hasattr(e, 'response') and e.response is not None:
        print(e.response.text)
