import socket
try:
    ip = socket.gethostbyname("db.bjidrhoniciczqkhazqv.supabase.co")
    print(f"Supabase IPv4: {ip}")
except Exception as e:
    print(f"Error: {e}")
