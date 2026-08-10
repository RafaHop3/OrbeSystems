import urllib.request
try:
    req = urllib.request.Request("https://orbesystems.com.br/remover-dados/jusbrasil?cache=bypass123", headers={'User-Agent': 'Mozilla/5.0'})
    res = urllib.request.urlopen(req)
    print(f"Status: {res.status}")
except Exception as e:
    print(f"Error fetching: {e}")
