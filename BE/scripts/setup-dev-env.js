import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const target = new URL('../.env', import.meta.url);
let contents;
try { contents = await readFile(target, 'utf8'); }
catch (error) { if (error.code !== 'ENOENT') throw error; contents = await readFile(new URL('../.env.example', import.meta.url), 'utf8'); }
if (!/^NODE_ENV=development\s*$/mu.test(contents)) throw new Error('This helper only supports NODE_ENV=development');
for (const name of ['JWT_ACCESS_KEY_HEX', 'JWT_REFRESH_KEY_HEX', 'MAIL_OUTBOX_KEY_HEX']) {
  const line = new RegExp(`^${name}=([^\\r\\n]*)`, 'mu');
  const existing = contents.match(line);
  if (existing?.[1].trim()) continue; // Never replace an existing signing/encryption key.
  const value = `${name}=${randomBytes(32).toString('hex')}`;
  contents = existing ? contents.replace(line, value) : `${contents}\n${value}\n`;
}
await writeFile(target, contents, { mode: 0o600 });
console.log('BE/.env ready for development; existing keys preserved. Keys were not printed.');
