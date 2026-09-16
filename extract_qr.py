import re

with open("docker_logs_bot.txt", "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r'(<div.*?</div>)', content, re.DOTALL)
if match:
    html = f"""
    <html>
    <head><title>Orbe Systems WhatsApp QR</title></head>
    <body style="background: black;">
        {match.group(1)}
    </body>
    </html>
    """
    with open(r"C:\Users\rafae\.gemini\antigravity\brain\81ff15a8-950a-4305-b091-6e2a8ee65b54\bot_pairing_qr.html", "w", encoding="utf-8") as out:
        out.write(html)
    print("QR Code HTML saved to artifacts")
else:
    print("Failed to find QR code div in logs")
