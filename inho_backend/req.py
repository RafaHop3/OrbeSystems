import urllib.request, urllib.error
req = urllib.request.Request('http://localhost:8000/api/v1/audit/all?limit=5', headers={'Authorization': 'Bearer dev-bypass'})
try:
    print(urllib.request.urlopen(req).read().decode())
    with open('debug_out.txt', 'w') as f: f.write("Success")
except urllib.error.HTTPError as e:
    with open('debug_out.txt', 'w') as f:
        f.write(e.read().decode())
