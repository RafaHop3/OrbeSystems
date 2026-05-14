#!/usr/bin/env python3
"""Generate bcrypt hash for admin password."""
import bcrypt

# Change this to your desired password
PASSWORD = "Muhammadalivsroyjonesjr"

password_bytes = PASSWORD.encode('utf-8')
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password_bytes, salt)
hash_str = hashed.decode('utf-8')

print("="*60)
print("ADMIN_PASSWORD_HASH value:")
print("="*60)
print(hash_str)
print("="*60)
print(f"\nUse this exact value (no spaces, no newlines):")
print(f"\n{hash_str}")
