import sqlite3

conn = sqlite3.connect('inho_dev.db')
cursor = conn.cursor()
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
results = cursor.fetchall()
print('Tabelas:', results)
conn.close()