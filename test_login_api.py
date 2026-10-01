import requests

print("TESTING BACKEND:")
try:
    r1 = requests.post('https://api.orbesystems.com.br/api/auth/login', json={'email': 'rafael@orbesystems.com.br', 'password': 'Muhammadalivsroyjonesjr#Ju.130798'})
    print(r1.status_code, r1.text)
except Exception as e:
    print(e)
    
print("\nTESTING INHO BACKEND:")
try:
    r2 = requests.post('https://inho-api.orbesystems.com.br/api/v1/auth/login', data={'username': 'rafael@orbesystems.com.br', 'password': 'Muhammadalivsroyjonesjr#Ju.130798'})
    print(r2.status_code, r2.text)
except Exception as e:
    print(e)
