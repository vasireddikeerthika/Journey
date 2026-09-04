// Vercel Serverless Function: dynamically injects public runtime environment variables
module.exports = (req, res) => {
  const envPayload = `
window.process = window.process || { env: {} };
window.process.env = window.process.env || {};
window.process.env.NEXT_PUBLIC_SUPABASE_URL = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || '')};
window.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')};
window.PUBLIC_TUNNEL_URL = ${JSON.stringify(process.env.PUBLIC_TUNNEL_URL || '')};
window.ENV = window.process.env;
console.log('[env.js] Runtime environment variables loaded successfully.');
`;

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (typeof res.status === 'function') {
    res.status(200);
  } else {
    res.statusCode = 200;
  }
  res.end(envPayload);
};
