import subprocess
print("Running prod_e2e...")
try:
   res = subprocess.check_output([r"inho_backend\venv\Scripts\python", r"inho_backend\prod_e2e.py"], text=True, stderr=subprocess.STDOUT)
   print(res)
except subprocess.CalledProcessError as e:
   print(e.output)
