import os, time, random, requests
from playwright.sync_api import sync_playwright

BASE_API = "https://api.orbesystems.com.br"
FRONTEND_URL = "https://orbesystems.com.br"

email = f"e2e_test_{random.randint(100,9999)}@orbesystems.com.br"
pwd = "PasswordE2E#123!"

print(f"1. Registering user via API: {email}")
req = requests.post(f"{BASE_API}/api/users/register", json={"email": email, "password": pwd})
if req.status_code != 201:
    print("Failed to register:", req.text)
    exit(1)
token = req.json().get("access_token")

print("2. Upgrading user to PREMIUM in PostgreSQL directly via SSM...")
import json, subprocess
payload = {
    "DocumentName": "AWS-RunShellScript",
    "Targets": [ { "Key": "InstanceIds", "Values": ["i-058e26140671b3254"] } ],
    "Parameters": {
        "commands": [
            f"sudo docker exec orbe_postgres psql -U orbe_admin -d orbesystems -t -c \"UPDATE users SET role='premium' WHERE email='{email}';\""
        ]
    }
}
with open("ssm_promo.json", "w") as f: json.dump(payload, f)
res = subprocess.check_output(["aws", "ssm", "send-command", "--cli-input-json", "file://ssm_promo.json", "--region", "us-east-1", "--output", "json"], text=True)
cmd_id = json.loads(res)["Command"]["CommandId"]
time.sleep(10)

def run():
    print("3. Launching Playwright E2E browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.add_cookies([{
            "name": "orbe_auth_token",
            "value": token,
            "domain": "orbesystems.com.br",
            "path": "/"
        }])
        page = context.new_page()
        
        print(f"4. Navigating to {FRONTEND_URL}/ferramentas-premium/databroker-optout")
        page.goto(f"{FRONTEND_URL}/ferramentas-premium/databroker-optout")
        
        # Wait to see if "● LIVE" appears indicating SSE connected!
        print("Checking for LIVE indicator...")
        try:
            page.wait_for_selector("text=● LIVE", timeout=15000)
            print("=> SSE is LIVE!! Connecting indicator found without 404!")
        except Exception as e:
            print("=> FAILED to find LIVE indicator. Taking screenshot.")
            page.screenshot(path="e2e_failed_sse.png")
            raise e
            
        print("5. Submitting Ghost Engine Form")
        page.fill("input[placeholder='Rafael Hop...']", "John Doe Playwright")
        page.fill("input[placeholder='000.000.000-00']", "12345678909")
        page.select_option("select", "escavador")
        page.check("input[type='checkbox']")
        
        page.click("button:has-text('INICIAR VARREDURA')")
        
        print("6. Waiting for Ticket Card to appear on the right panel via SSE stream")
        page.wait_for_selector("text=PROCESSANDO", timeout=15000)
        print("=> TICKET card appeared successfully! Full E2E logic intact via Server Sent Events.")
        
        page.screenshot(path="e2e_success.png")
        print("Screenshot saved to e2e_success.png")
        browser.close()

run()
