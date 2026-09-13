import urllib.request
import urllib.error
import json

BASE_URL = "https://inho-api.orbesystems.com.br/api/v1"

def req_ok(url, method="GET", data=None, token=None):
    headers = {'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
        
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(req)
        body = res.read()
        return res.status, json.loads(body) if len(body) > 0 else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return e.code, body

print("Logging in...")
status, out = req_ok(f"{BASE_URL}/auth/login", "POST", {"email": "maira@orbesystems.com.br", "password": "MairaOrbesystems", "mfa_code": ""})
if status != 200:
    print(f"Login failed: {status} {out}")
    exit(1)

token = out.get("access_token")
print("Login OK! Access token received.")

print("Creating CRM Contact...")
payload = {
    "category": "CUSTOMER",
    "name": "TESTE E2E AUTOMATIZADO INHO",
    "document": "999.888.777-66",
    "email": "e2e@orbesystems.com.br",
    "is_active": True
}
status, contact = req_ok(f"{BASE_URL}/crm/contacts/", "POST", payload, token)
if status not in [200, 201]:
    print(f"Failed to create contact: {status} {contact}")
    exit(1)

contact_id = contact["id"]
print(f"Contact created with ID: {contact_id}")

print("Listing Contacts (GET /crm/contacts/)...")
status, contacts = req_ok(f"{BASE_URL}/crm/contacts/", "GET", None, token)
if status != 200:
    print(f"Failed to list contacts: {status} {contacts}")
    exit(1)

print(f"List successful. Found {len(contacts)} contacts.")

print(f"Fetching specific contact (GET /crm/contacts/{contact_id})...")
status, out = req_ok(f"{BASE_URL}/crm/contacts/{contact_id}", "GET", None, token)
if status != 200:
    print(f"Failed to fetch contact {contact_id}: {status} {out}")
    exit(1)
print(f"Specific contact fetch OK: {out.get('name')}")

print("Testing Accounts Payable totals (/crm/payable/summary/totals)...")
status, out = req_ok(f"{BASE_URL}/crm/payable/summary/totals", "GET", None, token)
print(f"Accounts Payable summary: {status} {out}")

print(f"Cleaning up: Deleting Contact {contact_id}...")
status, out = req_ok(f"{BASE_URL}/crm/contacts/{contact_id}", "DELETE", None, token)
if status not in [200, 204]:
    print(f"Failed to delete contact: {status} {out}")
else:
    print("Cleanup successful.")

print("All production checks passed!")
