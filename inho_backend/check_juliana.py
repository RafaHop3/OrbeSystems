import sqlite3
import os

db_path = "C:/Users/rafae/OrbeSystems/OrbeSystems/inho_backend/inhodb.sqlite"
if not os.path.exists(db_path):
    print("Database not found!")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("--- LOCAL DATABASE SEARCH FOR JULIANA ---")

try:
    cur.execute("SELECT name, phone FROM crm_contacts WHERE name LIKE '%Juli%'")
    print("CRM Contacts:", cur.fetchall())
except Exception as e:
    print("CRM Contacts Error:", str(e))

try:
    cur.execute("SELECT razao_social, telefone, email FROM cooperados WHERE razao_social LIKE '%Juli%' OR nome_fantasia LIKE '%Juli%'")
    print("Cooperados:", cur.fetchall())
except Exception as e:
    print("Cooperados Error:", str(e))
    
conn.close()
