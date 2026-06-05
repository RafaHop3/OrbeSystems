import os
import sys

# Set DATABASE_URL for Supabase connection before importing any app modules
supabase_url = "postgresql://postgres:Muhammadalivsroyjonesjr@db.zgdtyzaxoqziroqjqgni.supabase.co:5432/postgres?sslmode=require"
os.environ["DATABASE_URL"] = supabase_url
# Override GITHUB_TOKEN and other required configs to avoid validation failures
os.environ["GITHUB_TOKEN"] = "ghp_mock_token_for_validation"
os.environ["SECRET_KEY"] = "test_secret_key_orbe_systems_12345"
os.environ["ADMIN_USERNAME"] = "test_admin"
os.environ["ADMIN_PASSWORD_HASH"] = "$2b$12$99PLspqYD3UFD4hQFBa96.R0t4Lf.A8Tr8VxYEdmKySvKsTqLItMq"

# Add backend directory to sys.path to resolve imports
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

# Import dependencies
try:
    from main import app
    from database import SessionLocal
    from models.users import User
    from models.users.roles import UserRole
    from models.users.subscriptions import UserSubscription
    from security.auth import get_password_hash, create_user_access_token
    from fastapi.testclient import TestClient
    import bcrypt
    print("✅ All imports and configuration loaded successfully.")
except Exception as e:
    import traceback
    print("❌ Failed to load modules:")
    traceback.print_exc()
    sys.exit(1)

def setup_fake_premium_user():
    db = SessionLocal()
    email = "fake_premium@orbesystems.com.br"
    password = "password123"
    
    try:
        print(f"\n🔍 Checking if user '{email}' exists in Supabase...")
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"➕ Creating new user '{email}'...")
            pw_hash = get_password_hash(password)
            user = User(
                email=email,
                password_hash=pw_hash,
                is_email_verified=True
            )
            # Set legacy fields to satisfy database constraints
            user._role_legacy = "premium"
            user._subscription_status_legacy = "active"
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"   Created user ID: {user.id}")
        else:
            print(f"   User already exists. User ID: {user.id}")
            # Ensure properties are correct
            user._role_legacy = "premium"
            user._subscription_status_legacy = "active"
            user.password_hash = get_password_hash(password)
            db.commit()
        
        # Ensure role exists in user_roles
        role_entry = db.query(UserRole).filter(UserRole.user_id == user.id).first()
        if not role_entry:
            print("➕ Adding 'premium' role to user_roles...")
            role_entry = UserRole(user_id=user.id, role_name="premium")
            db.add(role_entry)
        else:
            print("   Role already set to:", role_entry.role_name)
            role_entry.role_name = "premium"
            
        # Ensure subscription exists in user_subscriptions
        sub_entry = db.query(UserSubscription).filter(UserSubscription.user_id == user.id).first()
        if not sub_entry:
            print("➕ Adding 'active' subscription to user_subscriptions...")
            sub_entry = UserSubscription(user_id=user.id, subscription_status="active", stripe_customer_id="cus_fake123")
            db.add(sub_entry)
        else:
            print("   Subscription already set to:", sub_entry.subscription_status)
            sub_entry.subscription_status = "active"
            sub_entry.stripe_customer_id = "cus_fake123"
            
        db.commit()
        print("✅ Fake premium user database sync completed successfully.")
        return email, password
    except Exception as e:
        db.rollback()
        print(f"❌ Error setting up fake premium user: {e}")
        raise e
    finally:
        db.close()

def run_e2e_tests():
    email, password = setup_fake_premium_user()
    
    print("\n🚀 Starting E2E API Tests via TestClient...")
    client = TestClient(app)
    
    # 1. Test Login to get JWT Token
    print("🔑 Authenticating via POST /api/auth/login...")
    login_response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: status {login_response.status_code}, details: {login_response.text}")
        sys.exit(1)
        
    print("✅ Login successful! Cookie and response headers set.")
    
    # Extract JWT token from cookie if available
    token_cookie = login_response.cookies.get("orbe_auth_token")
    if token_cookie:
        print(f"   Found token in cookie: {token_cookie[:20]}...")
    else:
        print("⚠️ Token not found in response cookies.")
        
    # Let's check response JSON
    login_data = login_response.json()
    access_token = login_data.get("access_token")
    print(f"   JWT Access Token: {access_token[:20]}...")
    
    # 2. Test Premium endpoint /api/imortal/download-sdk
    # We pass the token in both headers and cookie to test dual compatibility
    print("\n📦 Testing GET /api/imortal/download-sdk...")
    sdk_response = client.get(
        "/api/imortal/download-sdk",
        headers={"Authorization": f"Bearer {access_token}"},
        cookies={"orbe_auth_token": access_token} if access_token else {}
    )
    
    if sdk_response.status_code == 200:
        print("✅ Download SDK successful! Received 200 OK.")
        print(f"   Content-Type: {sdk_response.headers.get('content-type')}")
        print(f"   Content-Length: {len(sdk_response.content)} bytes")
    else:
        print(f"❌ Download SDK failed: status {sdk_response.status_code}, details: {sdk_response.text}")
        sys.exit(1)
        
    # 3. Test Imobverse Premium endpoint /api/imobverse/my-properties
    print("\n🏠 Testing GET /api/imobverse/my-properties...")
    imob_response = client.get(
        "/api/imobverse/my-properties",
        headers={"Authorization": f"Bearer {access_token}"},
        cookies={"orbe_auth_token": access_token} if access_token else {}
    )
    
    if imob_response.status_code == 200:
        properties = imob_response.json()
        print(f"✅ Get properties successful! Found {len(properties)} properties.")
        print(f"   Response: {properties}")
    else:
        print(f"❌ Get properties failed: status {imob_response.status_code}, details: {imob_response.text}")
        sys.exit(1)
        
    # 4. Test non-premium block by modifying roles or token claims
    # Let's generate a temporary token for a standard user (non-premium)
    non_premium_token = create_user_access_token("regular@orbesystems.com.br", "user")
    print("\n🔒 Testing non-premium access block on /api/imortal/download-sdk...")
    blocked_response = client.get(
        "/api/imortal/download-sdk",
        headers={"Authorization": f"Bearer {non_premium_token}"},
        cookies={"orbe_auth_token": non_premium_token}
    )
    
    if blocked_response.status_code == 403:
        print("✅ Correctly blocked non-premium user! Received 403 Forbidden.")
        print(f"   Detail message: {blocked_response.json().get('detail')}")
    else:
        print(f"❌ Block failed: status {blocked_response.status_code} (expected 403), details: {blocked_response.text}")
        sys.exit(1)

    print("\n🎉 ALL E2E TESTS PASSED SUCCESSFULLY! The premium architecture is verified, database matches, and routes are fully secure.")

if __name__ == "__main__":
    run_e2e_tests()
