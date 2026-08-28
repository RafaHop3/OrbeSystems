import os

with open(os.path.join("d:\\OrbeSystems\\orbe-systems\\run_e2e.py"), "r") as f:
    content = f.read()

content = content.replace("print(data.get(\"StandardOutputContent\"))", "with open('e2e_dump.txt', 'w', encoding='utf-8') as df: df.write(data.get('StandardOutputContent', '') + '\\nERR:\\n' + data.get('StandardErrorContent', ''))")
content = content.replace("print(\"---ERR---\")", "")
content = content.replace("print(data.get(\"StandardErrorContent\"))", "")

with open("d:\\OrbeSystems\\orbe-systems\\run_e2e.py", "w") as f:
    f.write(content)
