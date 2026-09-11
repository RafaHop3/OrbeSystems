import subprocess
result = subprocess.run(['python', '-m', 'pytest', 'tests/', '--disable-warnings', '--tb=short', '-q'], capture_output=True, text=True)
if 'FAILURES' in result.stdout:
    out = result.stdout.split('=================================== FAILURES ===================================')[1]
else:
    out = result.stdout[-5000:]
with open('failures_only.txt', 'w', encoding='utf-8') as f:
    f.write(out)
