import os

print("Hunting PAYMENT_REQUIRED globally in inho_backend")
import subprocess
out = subprocess.run(["findstr", "/s", "/c:PAYMENT_REQUIRED", r"D:\OrbeSystems\orbe-systems\inho_backend\*.*"], capture_output=True, text=True)
print(out.stdout)
