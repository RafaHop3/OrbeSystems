import os
file_path = 'inho_backend/models/models.py'
os.system(f"git checkout {file_path}")

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

inject = """
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import String
DB_UUID = String(36) if _IS_SQLITE else PG_UUID(as_uuid=False)
"""

# Replace all occurrences of Column(String(36) to Column(DB_UUID
text = text.replace('Column(String(36)', 'Column(DB_UUID')
# There is a standalone String(36) in the file we must replace for UUIDs but avoid replacing the logic if we had any
text = text.replace('id = Column(String(36)', 'id = Column(DB_UUID)')

target = '_PUBLIC_USERS_FK = "users.id" if _IS_SQLITE else "public.users.id"'
text = text.replace(target, target + "\n\n" + inject)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Safely refactored models")
