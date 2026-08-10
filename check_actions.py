import urllib.request, json
try:
    req = urllib.request.Request("https://api.github.com/repos/RafaHop3/OrbeSystems/actions/runs?per_page=3", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for run in data['workflow_runs']:
            print(f"Run {run['id']}: Status={run['status']}, Conclusion={run['conclusion']}, msg={run.get('head_commit',{}).get('message')[:30]}")
except Exception as e:
    print(f"Error: {e}")
