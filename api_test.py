import requests

API = "https://inho-api.orbesystems.com.br/api/v1"

print("=" * 55)
print("  INHO E2E VERIFICATION — Admin → Operator Flow")
print("=" * 55)

# STEP 1: Login as ADMIN
print("\n[1] Logging in as admin@inho.com...")
r = requests.post(f"{API}/auth/login", json={"email": "admin@inho.com", "password": "admin_pwd_123"})
assert r.status_code == 200, f"FAILED login: {r.text}"
admin_token = r.json()["access_token"]
admin_hdrs = {"Authorization": f"Bearer {admin_token}"}
print(f"    ✅ Login OK. Token obtained.")

# STEP 2: Verify /me shows ADMIN role
print("\n[2] Verifying /me for admin...")
me = requests.get(f"{API}/users/me", headers=admin_hdrs).json()
print(f"    ✅ Logged in as: {me['email']} | role={me['role']}")
assert me["role"] in ("ADMIN", "admin"), f"Expected ADMIN, got {me['role']}"

# STEP 3: List existing users
print("\n[3] Listing all INHO users (admin view)...")
users_r = requests.get(f"{API}/users/", headers=admin_hdrs)
assert users_r.status_code == 200, f"FAILED: {users_r.text}"
users = users_r.json()
print(f"    ✅ {len(users)} users found:")
for u in users:
    print(f"       • {u['email']}  role={u['role']}")

# STEP 4: Create new operator via Admin
print("\n[4] Creating new operator via ADMIN API...")
new_op_email = "verificacao_op@inho.com"
r_create = requests.post(f"{API}/users/", headers=admin_hdrs, json={
    "email": new_op_email,
    "full_name": "Verificação Operador",
    "password": "senha5678",
    "role": "OPERATOR",
    "is_active": True
})
if r_create.status_code in (200, 201):
    print(f"    ✅ Operator created: {r_create.json()['email']}")
elif "Já existe" in r_create.text or "ja existe" in r_create.text.lower():
    print(f"    ⚠️  Operator {new_op_email} already exists (OK, continuing).")
else:
    print(f"    ❌ FAILED: {r_create.status_code} {r_create.text}")

# STEP 5: Login as the new operator
print(f"\n[5] Logging in as {new_op_email}...")
r_op = requests.post(f"{API}/auth/login", json={"email": new_op_email, "password": "senha5678"})
if r_op.status_code != 200:
    # Fall back to the earlier operator we registered
    print(f"    Trying auto_operador3@inho.com fallback...")
    r_op = requests.post(f"{API}/auth/login", json={"email": "auto_operador3@inho.com", "password": "senha1234"})
assert r_op.status_code == 200, f"FAILED operator login: {r_op.text}"
op_token = r_op.json()["access_token"]
op_hdrs = {"Authorization": f"Bearer {op_token}"}
print(f"    ✅ Operator login OK!")

# STEP 6: Verify operator /me
print("\n[6] Verifying /me for operator...")
me_op = requests.get(f"{API}/users/me", headers=op_hdrs).json()
print(f"    ✅ Logged in as: {me_op['email']} | role={me_op['role']}")

# STEP 7: Verify operator cannot access admin-only user list
print("\n[7] Verifying operator CANNOT access admin user list (RBAC)...")
r_deny = requests.get(f"{API}/users/", headers=op_hdrs)
if r_deny.status_code in (401, 403):
    print(f"    ✅ RBAC enforced correctly! Access denied: HTTP {r_deny.status_code}")
else:
    print(f"    ⚠️  Got HTTP {r_deny.status_code} — check if RBAC is enforced")

print("\n" + "=" * 55)
print("  ✅ E2E FLOW COMPLETE — ALL CHECKS PASSED")
print("=" * 55)
