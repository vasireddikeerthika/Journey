const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env.local if present
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envPath);
    } else {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const k = trimmed.slice(0, idx).trim();
            const v = trimmed.slice(idx + 1).trim();
            process.env[k] = v;
          }
        }
      });
    }
    console.log('[Dev Server] Loaded .env.local successfully.');
    console.log('[Dev Server] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded (defined)' : 'Undefined');
    console.log('[Dev Server] NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Loaded (defined)' : 'Undefined');
  } catch (err) {
    console.error('[Dev Server] Error loading .env.local:', err.message);
  }
} else {
  console.warn('[Dev Server] Warning: .env.local not found in project root');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const handleRequest = (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  let pathname = parsedUrl.pathname;

  // Serve runtime env script
  if (pathname === '/env.js') {
    const envPayload = `
window.process = window.process || { env: {} };
window.process.env = window.process.env || {};
window.process.env.NEXT_PUBLIC_SUPABASE_URL = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || '')};
window.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')};
window.PUBLIC_TUNNEL_URL = ${JSON.stringify(process.env.PUBLIC_TUNNEL_URL || '')};
window.ENV = window.process.env;
console.log(
  \`[env.js] Runtime environment variables injected:\\n\` +
  \`  • NEXT_PUBLIC_SUPABASE_URL defined: \${typeof window.process.env.NEXT_PUBLIC_SUPABASE_URL !== 'undefined' && window.process.env.NEXT_PUBLIC_SUPABASE_URL !== ''}\\n\` +
  \`  • NEXT_PUBLIC_SUPABASE_ANON_KEY defined: \${typeof window.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'undefined' && window.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== ''}\\n\` +
  \`  • PUBLIC_TUNNEL_URL: \${window.PUBLIC_TUNNEL_URL}\`
);
`;
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end(envPayload);
    return;
  }

  // Route root to index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);

  // Security check: ensure file is within __dirname
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`File not found: ${pathname}`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
};

const server = http.createServer(handleRequest);

// Only listen locally if not in Vercel serverless environment
if (require.main === module && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[Dev Server] Port ${PORT} is already in use by another instance.`);
      console.log(`[Dev Server] Journey Dashboard is active and accessible at http://localhost:${PORT}`);
      process.exit(0);
    } else {
      console.error('[Dev Server] Server error:', err);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`[Dev Server] Journey Dashboard running at http://localhost:${PORT}`);
  });
}

module.exports = handleRequest;
