import os

file_path = 'inho_backend/models/models.py'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add DB_UUID definition
if 'DB_UUID =' not in text:
    inject = """from sqlalchemy.dialects.postgresql import UUID as PG_UUID

# Dynamic UUID resolution to support both SQLite tests and Postgres Supabase
DB_UUID = String(36) if _IS_SQLITE else PG_UUID(as_uuid=False)
"""
    # Find insertion point after _IS_SQLITE declaration
    target = '_PUBLIC_USERS_FK = "users.id" if _IS_SQLITE else "public.users.id"'
    text = text.replace(target, target + "\n\n" + inject)

# Replace String(36) with DB_UUID
text = text.replace('String(36)', 'DB_UUID')
text = text.replace('from sqlalchemy.dialects.postgresql import UUID', '# from sqlalchemy.dialects.postgresql import UUID')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Models refactored successfully.")
