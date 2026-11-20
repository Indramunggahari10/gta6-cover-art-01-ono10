// serve.ts — local dev server for Sunset Cover Studio (Node 22, stdlib only).
// Serves app/ as static files on http://localhost:8080 so the app can be
// tried in desktop Chrome exactly as the grader's static server will serve it.
// Run: `node serve.ts` (or `PORT=8000 node serve.ts`).
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const port = Number(process.env.PORT ?? 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer((req, res) => {
  const reqPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
  const joined = normalize(join(root, reqPath));
  const file = (joined === root || (existsSync(joined) && statSync(joined).isDirectory()))
    ? join(joined, 'index.html')
    : joined;
  if (!file.startsWith(resolve(root)) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

server.listen(port, () => {
  console.log(`Sunset Cover Studio at http://localhost:${port} (serving app/)`);
});
