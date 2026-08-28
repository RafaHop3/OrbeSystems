import os
import zipfile
import base64
import boto3
import time
import sys

# 1. Create a zip of inho_backend (only code)
local_dir = r"d:\OrbeSystems\orbe-systems\inho_backend"
zip_path = r"d:\OrbeSystems\orbe-systems\inho_backend_sync.zip"

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(local_dir):
        # Exclude git, venv, pycache, etc
        if '__pycache__' in root or '.pytest_cache' in root or 'data' in root:
            continue
        for file in files:
            if file.endswith('.pyc') or file == '.env':
                continue
            abs_file = os.path.join(root, file)
            arcname = os.path.relpath(abs_file, local_dir)
            zipf.write(abs_file, arcname)

with open(zip_path, "rb") as f:
    zip_b64 = base64.b64encode(f.read()).decode('utf-8')

print(f"Zip created. Size in Base64: {len(zip_b64)} chars (limit 24KB for SSM params)")

if len(zip_b64) > 60000:
    print("WARNING: Payload too large for SSM single command parameter!")
    # We will upload it chunk by chunk or using S3? 
    # Actually, let's just upload the 3 known missing files to save time and complexity if it's too big.
