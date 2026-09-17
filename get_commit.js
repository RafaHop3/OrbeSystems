const { execSync } = require('child_process');
const fs = require('fs');
try {
    const content = execSync('git show 56e5222:frontend/src/components/OrbeStudioPromo.tsx');
    fs.writeFileSync('commit_content.txt', content);
} catch (e) {
    console.error(e.message);
}
