import time
import subprocess
print("Waiting 60s for Vercel Deploy...")
time.sleep(60)
print("Deploy time passed, starting daemon.")
subprocess.run(["python", "curl_loop_proof.py"])
