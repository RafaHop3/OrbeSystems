"""
Setup local environment for Orbe Systems backend
Run this script to create a .env.local file with admin credentials
"""
import os

env_content = """ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$MJcairwUG/DEE5j6MR1e3Onvpv81bMijTY1Uejwh83qr6PRK4zWb6
SECRET_KEY=orbe-systems-secret-key-2024-development
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./data/projects.db
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,https://orbesystems.com.br,https://www.orbesystems.com.br
"""

env_file = ".env.local"
with open(env_file, "w") as f:
    f.write(env_content)

print(f"Created {env_file} with admin credentials")
print("Admin username: admin")
print("Admin password: OrbeAdmin2024!")
print("\nYou can now start the backend server and test the admin login.")
