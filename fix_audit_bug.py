import os, subprocess
pth = "inho_backend/routers/audit.py"
with open(pth, encoding="utf-8") as f:
    txt = f.read()
txt = txt.replace('\x01', '')
with open(pth, "w", encoding="utf-8") as f:
    f.write(txt)

# Find true git root
subprocess.run(["git", "add", pth])
# Ignore exit code in case nothing changed (though unlikely)
subprocess.run(["git", "commit", "-m", "fix(api): scrub hidden non-printable character causing uvicorn crash"])
subprocess.run(["git", "push", "origin", "HEAD"])
print("Git operations executed!")
