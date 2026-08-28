import subprocess, json, time, sys

test_script = """
import requests
import random

BASE_URL = "http://localhost:8001/api/v1"

def run_test():
    test_email = f"inho_test_{random.randint(1000, 9999)}@orbesystems.com.br"
    password = "InhoPassword#123"
    
    print(f"--- Starting INHO End-2-End Authentication & Users Flow ---")
    print(f"Target: {test_email}")
    
    # 1. Register
    print("\\n1. Registering new INHO user...")
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
    print("\\n2. Logging in...")
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
    print("\\n3. Fetching User Profile (/users/me)...")
    r = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if r.status_code != 200:
        print(f"FAILED GET /me: {r.status_code} - {r.text}")
        return
    print(f"PROFILE FETCH SUCCESS! Name: {r.json().get('full_name')}")
    
    # 4. Patch /users/{user_id}
    print("\\n4. Updating User Profile...")
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
            
    print("\\n--- INHO E2E TEST COMPLETED ---")

if __name__ == '__main__':
    run_test()
"""

with open("test_inho_script.py", "w", encoding="utf-8") as rf:
    rf.write(test_script)

payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            "cd /home/ubuntu/orbe-systems",
            "cat << 'EOF' > test_inho_script.py\n" + test_script.replace('$', '\\$') + "\nEOF",
            "sudo apt-get install -y python3-requests > /dev/null 2>&1 || true",
            "python3 test_inho_script.py"
        ]
    }
}
with open("test_inho_req.json", "w", encoding="utf-8") as f: json.dump(payload, f)

res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://test_inho_req.json", "--region", "us-east-1", "--output", "json"])
cmd_id = json.loads(res)["Command"]["CommandId"]

print("Wait...")
for _ in range(12):
    time.sleep(5)
    out = subprocess.run(["aws", "ssm", "get-command-invocation", "--command-id", cmd_id, "--instance-id", "i-058e26140671b3254", "--region", "us-east-1", "--output", "json"], capture_output=True)
    if out.returncode == 0:
        data = json.loads(out.stdout.decode('utf-8', errors='replace'))
        if data.get("Status") in ["Success", "Failed"]:
            with open("test_inho_out.txt", "w", encoding="utf-8") as lf:
                lf.write(data.get("StandardOutputContent", ""))
                lf.write("\n---\n")
                lf.write(data.get("StandardErrorContent", ""))
            print("Done")
            sys.exit(0 if data.get("Status") == "Success" else 1)
sys.exit(1)
