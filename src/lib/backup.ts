// Full-site backup & restore: every database table + every uploaded file in ONE file.
// Used to move the website to new hosting (Admin → Backup & move).
import { Prisma } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import zlib from 'zlib';
import { prisma } from './db';
import { UPLOAD_ROOT } from './upload';

// Prisma's model list (typed loosely: the shape differs slightly between Prisma engine types)
type Model = { name: string; fields: readonly { name: string; kind: string; type: string; isList?: boolean; relationFromFields?: readonly string[] }[] };
const models = () => ((Prisma as any).dmmf.datamodel.models || []) as readonly Model[];
const client = (name: string) => (prisma as any)[name.charAt(0).toLowerCase() + name.slice(1)];

/** Tables ordered so that a table comes after the tables it points to (users before applications, …). */
function ordered(): Model[] {
  const list = [...models()];
  const deps = new Map(list.map((m) => [m.name, new Set(m.fields.filter((f) => f.kind === 'object' && (f.relationFromFields?.length || 0) > 0 && f.type !== m.name).map((f) => f.type))]));
  const out: Model[] = [];
  const seen = new Set<string>();
  const visit = (m: Model) => {
    if (seen.has(m.name)) return;
    seen.add(m.name);
    for (const d of deps.get(m.name) || []) {
      const dm = list.find((x) => x.name === d);
      if (dm) visit(dm);
    }
    out.push(m);
  };
  list.forEach(visit);
  return out;
}

async function listFiles(dir: string, base = dir): Promise<string[]> {
  let out: string[] = [];
  let entries: any[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await listFiles(full, base));
    else if (e.isFile() && e.name !== '.gitkeep') out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

export async function createBackup(): Promise<Buffer> {
  const tables: Record<string, any[]> = {};
  for (const m of ordered()) {
    const rows = await client(m.name).findMany();
    const bytes = m.fields.filter((f) => f.type === 'Bytes').map((f) => f.name);
    tables[m.name] = bytes.length ? rows.map((r: any) => ({ ...r, ...Object.fromEntries(bytes.map((b) => [b, r[b] ? { $b64: Buffer.from(r[b]).toString('base64') } : r[b]])) })) : rows;
  }
  const files: { path: string; data: string }[] = [];
  for (const rel of await listFiles(UPLOAD_ROOT)) {
    files.push({ path: rel, data: (await fs.readFile(path.join(UPLOAD_ROOT, rel))).toString('base64') });
  }
  const json = JSON.stringify({ app: 'goldenvisauae', version: 1, createdAt: new Date().toISOString(), tables, files });
  return zlib.gzipSync(Buffer.from(json), { level: 9 });
}

export async function restoreBackup(gz: Buffer) {
  let data: any;
  try {
    data = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
  } catch {
    throw new Error('This is not a website backup file.');
  }
  if (!['goldenvisauae', 'rak-golden-visa'].includes(data?.app) || !data.tables) throw new Error('This is not a website backup file.');

  const order = ordered();
  const prep = (m: Model, row: any) => {
    const out: any = {};
    for (const f of m.fields) {
      if (f.kind === 'object' || !(f.name in row)) continue;
      let v = row[f.name];
      if (v !== null && v !== undefined) {
        if (f.type === 'DateTime') v = new Date(v);
        else if (f.type === 'Bytes') v = Buffer.from(v.$b64 ?? v, 'base64');
      }
      out[f.name] = v;
    }
    return out;
  };

  const counts: Record<string, number> = {};
  await prisma.$transaction(
    async (tx) => {
      const c = (n: string) => (tx as any)[n.charAt(0).toLowerCase() + n.slice(1)];
      for (const m of [...order].reverse()) await c(m.name).deleteMany({});
      for (const m of order) {
        const rows = (data.tables[m.name] || []).map((r: any) => prep(m, r));
        for (let i = 0; i < rows.length; i += 200) await c(m.name).createMany({ data: rows.slice(i, i + 200) });
        counts[m.name] = rows.length;
      }
    },
    { timeout: 300_000, maxWait: 30_000 }
  );

  let written = 0;
  for (const f of data.files || []) {
    const rel = String(f.path || '').replace(/\\/g, '/');
    if (!rel || rel.includes('..') || rel.startsWith('/')) continue;
    const full = path.join(UPLOAD_ROOT, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, Buffer.from(f.data, 'base64'));
    written++;
  }
  return { tables: counts, files: written, createdAt: data.createdAt };
}
