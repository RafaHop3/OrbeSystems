import requests
BASE_URL = "https://inho-api.orbesystems.com.br/api/v1"
res = requests.post(f"{BASE_URL}/auth/login", json={"email": "rafael@orbesystems.com.br", "password": "Muhammadalivsroyjonesjr#Ju.130798", "mfa_code": ""})
token = res.json().get("access_token")
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
r = requests.post(f"{BASE_URL}/crm/contacts/", json={
    "category": "CUSTOMER",
    "name": "TESTE DEBUG",
    "document": "99988877766",
    "email": "teste@teste.com",
    "is_active": True
}, headers=headers)
with open("exc4.txt", "w", encoding="utf-8") as f:
    f.write(r.text)
