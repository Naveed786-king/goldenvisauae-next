// PM2 process file (VPS / xCloud): pm2 start ecosystem.config.js && pm2 save
// The port comes from the environment or from PORT=... in .env (default 3000),
// so several Node sites can run on one server.
const fs = require('fs');
const path = require('path');

function fromEnvFiles(key) {
  for (const f of ['.env.local', '.env']) {
    try {
      const m = fs.readFileSync(path.join(__dirname, f), 'utf8').match(new RegExp('^\\s*' + key + '\\s*=\\s*"?([^"\\r\\n]*)"?', 'm'));
      if (m && m[1]) return m[1].trim();
    } catch {}
  }
  return '';
}

const PORT = Number(process.env.PORT || fromEnvFiles('PORT') || 3000);

module.exports = {
  apps: [
    {
      name: 'goldenvisauae',
      script: 'server.js',
      cwd: __dirname,
      env: { NODE_ENV: 'production', PORT },
      max_memory_restart: '700M',
    },
  ],
};
