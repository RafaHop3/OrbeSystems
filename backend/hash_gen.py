import bcrypt

password = b"OrbeSystems2026!"
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password, salt)

print(f"PASSWORD: {password.decode()}")
print(f"HASH: {hashed.decode()}")
