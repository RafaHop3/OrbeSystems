import py_compile
import sys

files = [
    "routes/projects.py",
    "routes/admin_projects.py",
    "routes/upload.py",
    "routes/admin.py",
    "routes/auth.py",
    "services/upload_service.py",
    "services/metadata_service.py",
    "services/github_service.py",
    "models/metadata.py",
    "models/repository.py",
    "database.py",
    "config.py",
    "security/auth.py",
]

errors = []
for f in files:
    try:
        py_compile.compile(f, doraise=True)
        print(f"  OK  {f}")
    except py_compile.PyCompileError as e:
        print(f"  ERR {f}: {e}")
        errors.append(f)

print()
if errors:
    print(f"FALHOU: {len(errors)} arquivo(s) com erro de sintaxe")
    sys.exit(1)
else:
    print("TODOS OS ARQUIVOS OK - Nenhum erro de sintaxe encontrado")
