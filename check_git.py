import subprocess
import os

os.chdir(r"d:\OrbeSystems\orbe-systems")
try:
    result = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True, check=True)
    with open("push_err2.txt", "w", encoding="utf-8") as f:
        f.write("Success:\n" + result.stdout + "\n" + result.stderr)
except subprocess.CalledProcessError as e:
    with open("push_err2.txt", "w", encoding="utf-8") as f:
        f.write(e.stderr)
