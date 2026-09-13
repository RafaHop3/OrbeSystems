import json, urllib.request, urllib.error
req = urllib.request.Request(
    'https://inho-api.orbesystems.com.br/api/v1/auth/login',
    method='OPTIONS',
    headers={
        'Origin': 'https://inho.orbesystems.com.br',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
    }
)
try:
    res = urllib.request.urlopen(req)
    out = {"status": res.status, "headers": dict(res.headers)}
except urllib.error.HTTPError as e:
    out = {"status": e.code, "headers": dict(e.headers)}

with open("headers_out.json", "w") as f:
    json.dump(out, f, indent=2)
