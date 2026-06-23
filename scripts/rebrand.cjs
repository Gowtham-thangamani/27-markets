// One-off: rebrand user-facing website text from "Apex" to "27 Markets".
// Scope: index.html + src/** only (frontend). Backend/DB/internal keys untouched.
const fs = require('fs');
const path = require('path');

const repls = [
  [/Apex Markets/g, '27 Markets'],
  [/Apex Terminal/g, '27 Terminal'],
  [/Apex Mobile/g, '27 Mobile'],
  [/Apex Trader/g, '27 Trader'],
  [/apexmarkets\.io/g, '27markets.io'],
  [/\bApex\b/g, '27 Markets'], // any remaining standalone "Apex"
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const root = path.resolve(__dirname, '..');
const targets = [path.join(root, 'index.html'), ...walk(path.join(root, 'src'))]
  .filter((f) => /\.(tsx?|html|css)$/.test(f));

let changed = 0;
for (const f of targets) {
  const orig = fs.readFileSync(f, 'utf8');
  let s = orig;
  for (const [re, to] of repls) s = s.replace(re, to);
  if (s !== orig) {
    fs.writeFileSync(f, s);
    changed++;
    console.log('updated', path.relative(root, f));
  }
}
console.log('files changed:', changed);
