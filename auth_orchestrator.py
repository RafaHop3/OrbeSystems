import subprocess
import time
import os

def run():
    print("Starting gcloud auth login...")
    p = subprocess.Popen(
        [r"C:\Users\rafae\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd", "auth", "login", "--no-launch-browser"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1
    )
    
    url = ""
    # Gcloud prints the long URL broken into multiple lines in PowerShell occasionally
    while True:
        line = p.stdout.readline()
        if not line: break
        
        # Capture lines that look like the auth URL
        if "https://accounts.google.com/o/oauth2/auth" in line or ("response_type=" in line) or ("client_id=" in line) or ("code_challenge_method=S256" in line):
            url += line.strip()
            
        if "code_challenge_method=S256" in line or "verification code:" in line.lower():
            break
            
    # Clean up the URL in case it's broken
    import re
    url = re.sub(r'\s+', '', url)
            
    with open("auth_url.txt", "w") as f:
        f.write(url)
        
    print("Waiting for auth_token.txt to appear...")
    
    # Clean up old token if it exists
    if os.path.exists("auth_token.txt"):
        os.remove("auth_token.txt")
        
    while not os.path.exists("auth_token.txt"):
        time.sleep(2)
        
    with open("auth_token.txt", "r") as f:
        token = f.read().strip()
        
    print("Sending token to gcloud...")
    p.stdin.write(token + "\n")
    p.stdin.flush()
    
    out, _ = p.communicate()
    print("GCLOUD FINAL OUTPUT:")
    print(out)

if __name__ == '__main__':
    run()
