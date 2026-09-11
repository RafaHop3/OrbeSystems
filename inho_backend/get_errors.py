import subprocess
import codecs
import sys

sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
result = subprocess.run(['python', '-m', 'pytest', 'tests/', '--tb=short', '-q', '--disable-warnings'], capture_output=True, text=True, encoding='utf-8')
with open('errors.txt', 'w', encoding='utf-8') as f:
    f.write(result.stdout)
print("Done")
