import requests

def test_login():
    url = "https://inho-api.orbesystems.com.br/api/v1/auth/login"
    payload = {
        "username": "operator1@orbesystems.corafael@orbesystems.com.bn", 
        "password": "SenhaFortissima123!"
    }
    
    # Wait, look at the screenshot: The email typed was "operator1@orbesystems.corafael@orbesystems.com.bn"!!
    # The browser subagent typed it wrong!
    
    res = requests.post(url, data=payload)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.text}")

if __name__ == "__main__":
    test_login()
