"""
Setup script to generate admin credentials for Orbe Systems
"""
import bcrypt
from datetime import timedelta

# Generate a secure admin password hash
admin_password = "OrbeAdmin2024!"  # Change this to a secure password
admin_username = "admin"

# Generate hash
salt = bcrypt.gensalt()
password_hash = bcrypt.hashpw(admin_password.encode("utf-8"), salt).decode("utf-8")

print("=== ORBE SYSTEMS ADMIN CREDENTIALS ===")
print(f"ADMIN_USERNAME: {admin_username}")
print(f"ADMIN_PASSWORD_HASH: {password_hash}")
print(f"ADMIN_PASSWORD: {admin_password}")
print("\nAdd these to your .env file:")
print(f"ADMIN_USERNAME={admin_username}")
print(f"ADMIN_PASSWORD_HASH={password_hash}")
print(f"SECRET_KEY=your-secret-key-here")
