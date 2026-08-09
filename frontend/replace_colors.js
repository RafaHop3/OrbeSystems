const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace purple occurrences with blue/cyan configurations
    content = content.replace(/neon-purple/g, 'neon-blue');
    content = content.replace(/#bc13fe/g, '#00f2fe'); // Change ghost engine purple to bright cyan
    // Carefull replace of standard purple tailwind classes
    content = content.replace(/\bpurple-900\b/g, 'blue-900');
    content = content.replace(/\bpurple-800\b/g, 'blue-800');
    content = content.replace(/\bpurple-700\b/g, 'blue-700');
    content = content.replace(/\bpurple-600\b/g, 'blue-600');
    content = content.replace(/\bpurple-500\b/g, 'blue-500');
    content = content.replace(/\bpurple-400\b/g, 'blue-400');
    content = content.replace(/\bpurple-300\b/g, 'blue-300');
    content = content.replace(/\bpurple-200\b/g, 'blue-200');
    content = content.replace(/\bpurple-100\b/g, 'blue-100');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log("Updated: " + filePath);
    }
}

function walk(dir) {
    let files = fs.readdirSync(dir);
    for (let file of files) {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.css')) {
            replaceInFile(fullPath);
        }
    }
}

walk('d:/OrbeSystems/orbe-systems/frontend/src');
console.log("Color replacement done!");
