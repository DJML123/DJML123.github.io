const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
})(ROOT);

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const rnImport = /^import\s+\{([^}]*)\}\s+from\s+'react-native';\s*$/gm;
  let changed = false;
  const additions = [];

  src = src.replace(rnImport, (whole, namesRaw) => {
    const names = namesRaw.split(',').map((n) => n.trim()).filter(Boolean);
    const hasText = names.includes('Text');
    const hasTextInput = names.includes('TextInput');
    if (!hasText && !hasTextInput) return whole;
    changed = true;
    if (hasText) additions.push("import { AppText as Text } from '@/components/ui/app-text';");
    if (hasTextInput) additions.push("import { AppTextInput as TextInput } from '@/components/ui/app-text';");
    const rest = names.filter((n) => n !== 'Text' && n !== 'TextInput');
    if (rest.length === 0) return '';
    return `import { ${rest.join(', ')} } from 'react-native';`;
  });

  if (changed) {
    src = src.replace(/^(import .*)$/m, (firstImport) => `${firstImport}\n${additions.join('\n')}`);
    fs.writeFileSync(file, src);
    console.log('rewired', path.relative(ROOT, file));
  }
}
