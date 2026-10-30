import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

const PUBLIC_TYPES = /^(image\/(png|jpe?g|gif|webp|svg\+xml|avif|x-icon|vnd\.microsoft\.icon)|video\/(mp4|webm)|application\/pdf)$/;
const PRIVATE_TYPES = /^(image\/(png|jpe?g|webp|heic|heif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

/** On hosts without a permanent disk (Vercel) uploaded files are stored in the database. */
export const STORE_IN_DB = process.env.STORAGE === 'db' || (!!process.env.VERCEL && process.env.STORAGE !== 'disk');

// Vercel accepts request bodies up to 4.5 MB
export const MAX_UPLOAD = (process.env.VERCEL ? 4 : 15) * 1024 * 1024;
const MAX_LABEL = process.env.VERCEL ? '4 MB' : '15 MB';

async function writeStored(rel: string, data: Buffer, mime: string) {
  if (STORE_IN_DB) {
    const { prisma } = await import('./db');
    await prisma.storedFile.create({ data: { key: rel, data: new Uint8Array(data), mime, size: data.length } });
    return;
  }
  const full = path.join(UPLOAD_ROOT, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
}

/** Read a stored file by its relative path (e.g. "media/2026/01/x.jpg"). */
export async function readStored(rel: string): Promise<Buffer | null> {
  rel = rel.replace(/^\/?uploads\//, '');
  if (STORE_IN_DB) {
    const { prisma } = await import('./db');
    const f = await prisma.storedFile.findUnique({ where: { key: rel } });
    if (f) return Buffer.from(f.data);
  }
  const p = resolveStored(rel);
  if (!p) return null;
  try {
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

/** The file extension always follows the checked file type (a "page.html" sent as an image stays an image) */
const EXT_FOR_TYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

function cleanName(name: string, type?: string) {
  const ext = (type && EXT_FOR_TYPE[type]) || path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const base = path
    .basename(name, path.extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'file';
  return { base, ext };
}

/** The first bytes of a file must match the type the browser declared (a renamed page or script is refused) */
export function contentMatches(buf: Buffer, type: string): boolean {
  const head = buf.subarray(0, 16);
  const ascii = (a: number, b: number) => buf.subarray(a, b).toString('latin1');
  switch (type) {
    case 'image/png':
      return head[0] === 0x89 && ascii(1, 4) === 'PNG';
    case 'image/jpeg':
    case 'image/jpg':
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case 'image/gif':
      return ascii(0, 4) === 'GIF8';
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'image/avif':
    case 'image/heic':
    case 'image/heif':
    case 'video/mp4':
      return ascii(4, 8) === 'ftyp';
    case 'video/webm':
      return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
    case 'application/pdf':
      return buf.subarray(0, 1024).toString('latin1').includes('%PDF-');
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon':
      return head[0] === 0 && head[1] === 0 && head[2] === 1 && head[3] === 0;
    case 'application/msword':
      return head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0;
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return ascii(0, 4) === 'PK\u0003\u0004';
    case 'image/svg+xml': {
      const t = buf.toString('utf8');
      // an SVG picture never needs scripts, event handlers or embedded pages
      return /<svg[\s>]/i.test(t) && !/<script|\son[a-z]+\s*=|javascript:|<foreignObject|<iframe|<embed|<object/i.test(t);
    }
    default:
      return false;
  }
}

/** Save a public media file (images for the website). Returns the public URL. */
export async function savePublicFile(file: File) {
  if (file.size > MAX_UPLOAD) throw new Error(`File too large (max ${MAX_LABEL})`);
  if (!PUBLIC_TYPES.test(file.type)) throw new Error('File type not allowed: ' + file.type);
  const { base, ext } = cleanName(file.name, file.type);
  const now = new Date();
  const sub = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const fname = `${base}-${crypto.randomBytes(3).toString('hex')}${ext}`;
  const data = Buffer.from(await file.arrayBuffer());
  if (!contentMatches(data, file.type)) throw new Error('The file content does not match its type, or the SVG contains scripts');
  await writeStored(`media/${sub}/${fname}`, data, file.type);
  return { url: `/uploads/media/${sub}/${fname}`, filename: fname, size: file.size, mime: file.type };
}

/** Save a private document (customer uploads). Returns the relative storage path. */
export async function savePrivateFile(file: File, folder: string) {
  if (file.size > MAX_UPLOAD) throw new Error(`File too large (max ${MAX_LABEL})`);
  if (!PRIVATE_TYPES.test(file.type)) throw new Error('Only PDF, JPG, PNG, WEBP, HEIC or Word files are allowed');
  const { base, ext } = cleanName(file.name, file.type);
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
  const fname = `${base}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const data = Buffer.from(await file.arrayBuffer());
  if (!contentMatches(data, file.type)) throw new Error('This file looks damaged or is not really a PDF, image or Word file');
  await writeStored(`private/${safeFolder}/${fname}`, data, file.type);
  return { path: `private/${safeFolder}/${fname}`, size: file.size, mime: file.type };
}

export async function deleteStored(rel: string) {
  rel = rel.replace(/^\/?uploads\//, '');
  if (STORE_IN_DB) {
    try {
      const { prisma } = await import('./db');
      await prisma.storedFile.deleteMany({ where: { key: rel } });
    } catch {}
  }
  try {
    const p = path.resolve(UPLOAD_ROOT, rel);
    if (!p.startsWith(UPLOAD_ROOT + path.sep)) return;
    await fs.unlink(p);
  } catch {}
}

export function resolveStored(rel: string) {
  const p = path.resolve(UPLOAD_ROOT, rel);
  if (!p.startsWith(UPLOAD_ROOT + path.sep)) return null;
  return p;
}

export const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.heic': 'image/heic',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
