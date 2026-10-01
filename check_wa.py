import subprocess

try:
    out = subprocess.run(["python", "fire_whatsapp.py"], capture_output=True, text=True)
    with open("wa_clean_out.txt", "w", encoding="utf-8") as f:
        f.write(out.stdout)
    print("Clean dump executed.")
except Exception as e:
    print(e)
