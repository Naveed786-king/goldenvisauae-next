// Picks the right database schema automatically from DATABASE_URL and runs Prisma.
//   node scripts/db.mjs generate   -> create the database client
//   node scripts/db.mjs prepare    -> create/update tables + load starting content (only if empty)
//
// DATABASE_URL examples:
//   file:./data.db                     -> SQLite (default, no database server)
//   postgresql://user:pass@host/db     -> PostgreSQL (Vercel / Neon / Supabase / Prisma Postgres)
//   mysql://user:pass@host:3306/db     -> MySQL (cPanel hosting)
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load .env and .env.local (no extra dependency)
for (const name of ['.env.local', '.env']) {
  const envFile = path.join(root, name);
  if (!existsSync(envFile)) continue;
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Own hosting (xCloud, VPS…) without a JWT_SECRET: create a strong one once and keep it in
// .env.local (not in git), so logins are secure without typing a secret into the hosting panel.
if (!process.env.JWT_SECRET && !process.env.VERCEL && process.argv[2] === 'prepare') {
  const secret = crypto.randomBytes(48).toString('hex');
  writeFileSync(path.join(root, '.env.local'), (existsSync(path.join(root, '.env.local')) ? readFileSync(path.join(root, '.env.local'), 'utf8').replace(/\n?$/, '\n') : '') + `JWT_SECRET=${secret}\n`);
  process.env.JWT_SECRET = secret;
  console.log('[db] created a private login secret in .env.local');
}

// Vercel/Neon integrations sometimes only provide POSTGRES_* variables
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || '';
}
const url = process.env.DATABASE_URL || '';
const kind = /^postgres(ql)?:\/\//.test(url) ? 'postgresql' : /^mysql:\/\//.test(url) ? 'mysql' : 'sqlite';

function schemaPath() {
  if (kind === 'mysql') return 'prisma/schema.mysql.prisma';
  if (kind === 'postgresql') {
    const src = readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8').replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
    mkdirSync(path.join(root, 'prisma/postgres'), { recursive: true });
    writeFileSync(path.join(root, 'prisma/postgres/schema.prisma'), '// AUTO-GENERATED from prisma/schema.prisma by scripts/db.mjs - do not edit\n' + src);
    return 'prisma/postgres/schema.prisma';
  }
  return 'prisma/schema.prisma';
}

function run(cmd, env = {}) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
}

const action = process.argv[2] || 'generate';
const schema = schemaPath();
console.log(`[db] ${kind} database (schema: ${schema})`);

if (action === 'generate') {
  run(`npx prisma generate --schema ${schema}`);
} else if (action === 'prepare') {
  // Table changes need a direct (not pooled) connection when one is available
  const direct = kind === 'postgresql' ? process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || url : url;
  run(`npx prisma db push --skip-generate --schema ${schema}`, { DATABASE_URL: direct });
  run('node prisma/seed.mjs');
} else {
  console.error('Unknown action: ' + action);
  process.exit(1);
}
