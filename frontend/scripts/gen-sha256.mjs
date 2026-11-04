// Gera public/downloads/SHA256SUMS.txt e src/data/cleaner_hashes.json (Manual 11, §3.5)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const files = ['orbe-cleaner-win.bat', 'orbe-cleaner-mac.sh'];
const out = {};
let txt = '';
for (const f of files) {
  const h = createHash('sha256').update(readFileSync(`public/downloads/${f}`)).digest('hex');
  out[f] = h;
  txt += `${h}  ${f}\n`;
}
writeFileSync('public/downloads/SHA256SUMS.txt', txt);
mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/cleaner_hashes.json', JSON.stringify(out, null, 2) + '\n');
console.log(txt);
