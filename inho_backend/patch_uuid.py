import glob, re, os

files = glob.glob('routers/*.py')
count = 0
for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        data = fp.read()
    
    data2 = re.sub(r'(\b\w+_id):\s*UUID\b', r'\1: str', data)
    data2 = re.sub(r'supplier_id:\s*Optional\[UUID\]', r'supplier_id: Optional[str]', data2)
    data2 = re.sub(r'respondent_id:\s*Optional\[UUID\]', r'respondent_id: Optional[str]', data2)
    data2 = re.sub(r'(\b\w+_id):\s*Union\[UUID,\s*str\]', r'\1: str', data2)

    # Some id fields might just be called 'id: UUID'
    data2 = re.sub(r'\bid:\s*UUID\b', r'id: str', data2)
    
    if data != data2:
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(data2)
        count += 1
        print(f'Patched {f}')

print(f'Patched {count} files.')
