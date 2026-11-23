// Customer dashboard address (app.goldenvisauae.ai).
// Forwards every request to the main goldenvisauae.ai app on this server, marked with the
// dashboard address, so the app serves the client dashboard there. One app, one database.
const http = require('http');

const TARGET_PORT = Number(process.env.TARGET_PORT || 3108);
const HOST = process.env.PORTAL_HOST || 'app.goldenvisauae.ai';
const PORT = Number(process.env.PORT || 3109);

http
  .createServer((req, res) => {
    const headers = { ...req.headers, host: HOST, 'x-forwarded-host': HOST, 'x-forwarded-proto': 'https' };
    const up = http.request({ host: '127.0.0.1', port: TARGET_PORT, method: req.method, path: req.url, headers }, (r) => {
      res.writeHead(r.statusCode || 502, r.headers);
      r.pipe(res);
    });
    up.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('The client dashboard is starting, please try again in a moment.');
    });
    req.pipe(up);
  })
  .listen(PORT, () => console.log(`gateway ${HOST} :${PORT} -> 127.0.0.1:${TARGET_PORT}`));
