const fs = require('fs');
const path = require('path');

const src1 = path.join(__dirname, 'src', 'shaders', 'globe', 'sources', 'tangled-constellations.html');
const t = fs.readFileSync(src1, 'utf8');
fs.writeFileSync(src1.replace('.html', '.ts'), 'const html = ' + JSON.stringify(t) + ';\nexport default html;');

const src2 = path.join(__dirname, 'src', 'shaders', 'globe', 'sources', 'network-globe.html');
const n = fs.readFileSync(src2, 'utf8');
fs.writeFileSync(src2.replace('.html', '.ts'), 'const html = ' + JSON.stringify(n) + ';\nexport default html;');

console.log("Templates compiled successfully to TS!");
