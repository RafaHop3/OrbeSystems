import requests
import time
import random

BASE_URL = "http://localhost:8000"

def run_test():
    test_email = f"test_user_{random.randint(1000, 9999)}@orbesystems.com.br"
    old_password = "TestPassword#123"
    new_password = "NewPassword#456"
    
    print(f"--- Starting E2E Flow for {test_email} ---")
    
    # 1. Register
    print("1. Registering new user...")
    r = requests.post(f"{BASE_URL}/api/users/register", json={
        "email": test_email,
        "password": old_password
    })
    
    if r.status_code != 201:
        print(f"FAILED Register: {r.status_code} - {r.text}")
        return
        
    data = r.json()
    token = data.get("access_token")
    print(f"REGISTER SUCCESS! Token obtained.")
    
    # 2. Checkout (Bypass to Premium)
    print("2. Subscribing to premium via checkout bypass... (SKIPPED in prod due to Stripe)")
    # headers = {"Authorization": f"Bearer {token}"}
    # r = requests.post(f"{BASE_URL}/api/users/checkout", headers=headers)
    # if r.status_code != 200:
    #     print(f"FAILED Checkout: {r.status_code} - {r.text}")
    #     return
    #     
    # print(f"CHECKOUT SUCCESS! {r.json()}")
    
    # 3. Verify Role via /login (simulating re-login)
    print("3. Re-logging in to get premium token...")
    r = requests.post(f"{BASE_URL}/api/users/login", json={
        "email": test_email,
        "password": old_password
    })
    if r.status_code != 200:
        print(f"FAILED Login 1: {r.status_code} - {r.text}")
        return
    
    data = r.json()
    token = data.get("access_token")
    role = data.get("user", {}).get("role")
    print(f"LOGIN 1 SUCCESS! New role: {role}")
    
    # 4. Change Password
    print("4. Changing password...")
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{BASE_URL}/api/users/change-password", headers=headers, json={
        "current_password": old_password,
        "new_password": new_password
    })
    
    if r.status_code != 200:
        print(f"FAILED Change Password: {r.status_code} - {r.text}")
        return
        
    print("CHANGE PASSWORD SUCCESS!")
    
    # 5. Re-login with old password (should fail)
    print("5. Testing old password login...")
    r = requests.post(f"{BASE_URL}/api/users/login", json={
        "email": test_email,
        "password": old_password
    })
    if r.status_code == 401:
        print("OLD PASSWORD CORRECTLY FAILED!")
    else:
        print(f"UNEXPECTED RESULT for old password: {r.status_code}")
        
    # 6. Re-login with new password
    print("6. Testing new password login...")
    r = requests.post(f"{BASE_URL}/api/users/login", json={
        "email": test_email,
        "password": new_password
    })
    if r.status_code == 200:
        print("NEW PASSWORD SUCCESS!")
    else:
        print(f"FAILED New Password login: {r.status_code} - {r.text}")

if __name__ == "__main__":
    run_test()
