const fs = require('fs');
const f = 'c:/Users/yoels/OneDrive/Escritorio/RESPALDO - copia/cliente.html';
const raw = fs.readFileSync(f, 'utf8');
// Detect line ending
const crlf = raw.includes('\r\n');
const sep = crlf ? '\r\n' : '\n';
const lines = raw.split(sep);

let si = -1, ei = -1;
for (let i = 0; i < lines.length; i++) {
  if (si < 0 && lines[i].includes('const params = new URLSearchParams') &&
      lines[i + 1] && lines[i + 1].includes('form id="register-form"')) {
    si = i;
  }
  if (ei < 0 && lines[i].includes('function setText(id, value)')) {
    ei = i;
  }
}
console.log('si=' + si + ' ei=' + ei + ' total=' + lines.length);

if (si < 0 || ei < 0) {
  console.log('ERROR: markers not found. Aborting.');
  process.exit(1);
}

// Lines to insert between si and ei (complete the try block)
const insert = [
  '        const next = (params.get(\'next\') || \'\').trim();',
  '        if (next) {',
  '          const btn = byId(\'client-sticky-btn\');',
  '          if (btn) btn.href = next;',
  '        }',
  '      } catch (_) {}',
  ''
];

// Keep: lines[0..si] (inclusive) + insert + lines[ei..]
const result = [
  ...lines.slice(0, si + 1),
  ...insert,
  ...lines.slice(ei)
];

fs.writeFileSync(f, result.join(sep), 'utf8');
console.log('Done! Lines: ' + result.length + ' (was ' + lines.length + ')');
