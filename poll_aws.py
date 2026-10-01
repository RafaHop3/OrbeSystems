import requests
import time
import sys

def main():
    print("Waiting for AWS server to come back online...")
    url = "https://inho-api.orbesystems.com.br/api/v1/health"
    for i in range(120):
        try:
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                print("SERVER IS UP AND RESPONDING 200 OK!")
                # Run the actual test
                import os
                os.system("python test_whatsapp_juliana.py")
                return
        except Exception:
            pass
        time.sleep(3)
        if i % 10 == 0:
            print(f"Still waiting... {i*3}s")
    
    print("Timeout waiting for server.")

if __name__ == "__main__":
    main()
