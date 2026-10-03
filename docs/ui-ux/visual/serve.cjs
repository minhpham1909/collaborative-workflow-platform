// Local preview only. Serves an explicit list of design artifacts on loopback.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const allowed = new Set(['index.html', 'theme.css', 'core.js', 'visual.js', 'home-desktop.png', 'board-desktop.png', 'task-desktop.png']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const previewPort = Number(process.env.VISUAL_PREVIEW_PORT ?? 4174);
if (!Number.isInteger(previewPort) || previewPort < 1024 || previewPort > 65535) throw new Error('Invalid preview port');
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  let file;
  try { const url = new URL(request.url, 'http://localhost'); file = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1); }
  catch { response.writeHead(400); response.end(); return; }
  if (!allowed.has(file)) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const data = await fs.readFile(path.join(__dirname, file));
    response.writeHead(200, {
      'Content-Type': mime[path.extname(file)], 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'"
    });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.on('error', error => { console.error('Preview could not start:', error.code); process.exitCode = 1; });
server.listen(previewPort, '127.0.0.1', () => console.log(`Visual preview: http://127.0.0.1:${previewPort}/`));
process.on('SIGINT', () => server.close());
process.on('SIGTERM', () => server.close());
