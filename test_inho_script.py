
import requests
import random

BASE_URL = "http://localhost:8001/api/v1"

def run_test():
    test_email = f"inho_test_{random.randint(1000, 9999)}@orbesystems.com.br"
    password = "InhoPassword#123"
    
    print(f"--- Starting INHO End-2-End Authentication & Users Flow ---")
    print(f"Target: {test_email}")
    
    # 1. Register
    print("\n1. Registering new INHO user...")
    r = requests.post(f"{BASE_URL}/auth/register", json={
        "email": test_email,
        "password": password,
        "full_name": "Inho Tester",
        "role": "admin"
    })
    
    if r.status_code != 201:
        print(f"FAILED Register: {r.status_code} - {r.text}")
        return
    print("REGISTER SUCCESS!")
    user_id = r.json().get("user_id")
    
    # 2. Login
    print("\n2. Logging in...")
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": password
    })
    if r.status_code != 200:
        print(f"FAILED Login: {r.status_code} - {r.text}")
        return
    token = r.json().get("access_token")
    print("LOGIN SUCCESS!")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Get /users/me
    print("\n3. Fetching User Profile (/users/me)...")
    r = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if r.status_code != 200:
        print(f"FAILED GET /me: {r.status_code} - {r.text}")
        return
    print(f"PROFILE FETCH SUCCESS! Name: {r.json().get('full_name')}")
    
    # 4. Patch /users/{user_id}
    print("\n4. Updating User Profile...")
    r = requests.patch(f"{BASE_URL}/users/{user_id}", headers=headers, json={
        "full_name": "Inho Updated Test User"
    })
    if r.status_code != 200:
        print(f"FAILED PATCH /users/{user_id}: {r.status_code} - {r.text}")
        # Note: PATCH might be protected by require_admin. Let's see if the user was granted admin.
    else:
        print("PROFILE UPDATE SUCCESS!")
        
        # Verify changes
        r = requests.get(f"{BASE_URL}/users/me", headers=headers)
        if r.json().get('full_name') == "Inho Updated Test User":
            print("VERIFICATION SUCCESS! Update was actively persisted.")
        else:
            print("update was not persisted.")
            
    print("\n--- INHO E2E TEST COMPLETED ---")

if __name__ == '__main__':
    run_test()
