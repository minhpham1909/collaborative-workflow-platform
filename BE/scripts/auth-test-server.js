import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

if (process.env.NODE_ENV !== 'development') throw new Error('Auth test page requires NODE_ENV=development');
if (process.env.WEB_ORIGIN !== 'http://localhost:5173') throw new Error('Auth test page requires WEB_ORIGIN=http://localhost:5173');
const page = await readFile(new URL('../devtools/auth-test.html', import.meta.url));
const script = await readFile(new URL('../devtools/auth-harness.js', import.meta.url));
const server = createServer((req, res) => {
  if (req.headers.host !== 'localhost:5173') { res.writeHead(403).end(); return; }
  const path = req.url?.split('?')[0];
  const javascript = path === '/auth-test.js';
  if (req.method !== 'GET' || (!javascript && !['/', '/verify-email', '/reset-password', '/invite'].includes(path))) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': javascript ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer-when-downgrade', 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; frame-src https://accounts.google.com/gsi/; connect-src 'self' http://localhost:4000 https://accounts.google.com/gsi/; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; img-src 'self' https://*.googleusercontent.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  });
  res.end(javascript ? script : page);
});
server.listen(5173, '127.0.0.1', () => console.log('Development Auth test page: http://localhost:5173'));
server.on('error', () => { console.error('AUTH_TEST_SERVER_FAILED: check port 5173'); process.exitCode = 1; });
process.once('SIGINT', () => server.close()); process.once('SIGTERM', () => server.close());
