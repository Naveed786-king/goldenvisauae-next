// Seeds the database with the website content and the first admin user.
//   node prisma/seed.mjs          -> only fills an EMPTY database (safe to run on every build / start)
//   node prisma/seed.mjs --force  -> re-creates all pages/posts/services/FAQs (keeps users, leads & applications)
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env / .env.local manually (no extra dependency)
for (const name of ['.env.local', '.env']) {
  const envFile = path.join(__dirname, '..', name);
  if (!existsSync(envFile)) continue;
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || '';
const prisma = globalThis.__seedPrisma || new PrismaClient();
const force = process.argv.includes('--force');
const C = await import('./content.mjs');

async function main() {
  // 1) Admin user
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount === 0 && !process.env.ADMIN_PASSWORD && (process.env.VERCEL || process.env.ADMIN_SETUP === 'web')) {
    // No default password on public hosting: the first visitor of /admin/login creates the admin account.
    console.log('ℹ No admin yet - open /admin/login on your website to create the admin account.');
  } else if (adminCount === 0) {
    const email = (process.env.ADMIN_EMAIL || 'admin@goldenvisauae.ai').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
    await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN', active: true, passwordHash: await bcrypt.hash(password, 10) },
      create: { name: 'Administrator', email, role: 'ADMIN', passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`✔ Admin user created: ${email} / ${password}  (change it after first login!)`);
  }

  // 2) Built-in professional translations (Arabic, Russian …)
  await loadTranslationPacks();

  // 3) Content
  await applyPageUpgrades();
  await applyContentUpgrades();
  await applyReviewUpgrade();
  const pageCount = await prisma.page.count();
  if (pageCount > 0 && !force) {
    console.log('✔ Database already has content — skipping content seed (use "npm run seed:reset" to restore the original content).');
    return;
  }

  if (force) {
    await prisma.page.deleteMany({ where: { slug: { in: C.allPages.map((p) => p.slug) } } });
    await prisma.post.deleteMany({ where: { slug: { in: C.posts.map((p) => p.slug) } } });
    await prisma.service.deleteMany({});
    await prisma.faq.deleteMany({});
    await prisma.partner.deleteMany({});
    await prisma.translation.deleteMany({ where: { status: 'auto' } });
  }

  for (const p of C.allPages) {
    await prisma.page.create({
      data: { slug: p.slug, title: p.title, metaTitle: p.metaTitle, metaDescription: p.metaDescription, blocks: JSON.stringify(p.blocks), status: 'published' },
    });
  }
  console.log(`✔ ${C.allPages.length} pages`);
  // fresh content already includes every page upgrade
  for (const id of CONTENT_UPGRADES) await prisma.setting.upsert({ where: { key: 'upgrade:' + id }, update: {}, create: { key: 'upgrade:' + id, value: new Date().toISOString() } });
  for (const up of PAGE_UPGRADES) await prisma.setting.upsert({ where: { key: 'upgrade:' + up.id }, update: {}, create: { key: 'upgrade:' + up.id, value: new Date().toISOString() } });

  for (const p of C.posts) {
    await prisma.post.create({ data: { ...p, publishedAt: new Date(p.publishedAt), author: 'Golden Visa UAE', status: 'published' } });
  }
  console.log(`✔ ${C.posts.length} blog posts`);

  for (const s of C.serviceRecords) await prisma.service.create({ data: s });
  console.log(`✔ ${C.serviceRecords.length} services`);

  for (const f of C.faqRecords) await prisma.faq.create({ data: { ...f, active: true } });
  console.log(`✔ ${C.faqRecords.length} FAQs`);

  for (const p of C.partnerRecords) await prisma.partner.create({ data: p });
  console.log(`✔ ${C.partnerRecords.length} government department names (upload their logos in Admin → Partner logos)`);

  if ((await prisma.testimonial.count()) === 0) {
    for (const t of C.testimonialRecords) await prisma.testimonial.create({ data: t });
    console.log(`✔ ${C.testimonialRecords.length} client reviews`);
  }
}

/* Rebuilt pages shipped with a new version: replaced once on existing websites
   (the previous version is kept as a draft copy, so nothing an admin wrote is lost). */
const PAGE_UPGRADES = [{ id: '2026-10-status-family', slugs: ['check-visa-status', 'services/family-visa'] }];
async function applyPageUpgrades() {
  if ((await prisma.page.count()) === 0) return;
  for (const up of PAGE_UPGRADES) {
    const key = 'upgrade:' + up.id;
    if (await prisma.setting.findUnique({ where: { key } })) continue;
    for (const slug of up.slugs) {
      const fresh = C.allPages.find((p) => p.slug === slug);
      if (!fresh) continue;
      const old = await prisma.page.findUnique({ where: { slug } });
      if (old) {
        const backup = `${slug}-previous-${up.id}`.replace(/\//g, '-');
        if (!(await prisma.page.findUnique({ where: { slug: backup } })))
          await prisma.page.create({ data: { slug: backup, title: `${old.title} (previous version)`, metaTitle: old.metaTitle, metaDescription: old.metaDescription, blocks: old.blocks, status: 'draft' } });
        await prisma.translation.deleteMany({ where: { entity: 'page', entityId: old.id } }).catch(() => {});
        await prisma.page.update({ where: { slug }, data: { title: fresh.title, metaTitle: fresh.metaTitle, metaDescription: fresh.metaDescription, blocks: JSON.stringify(fresh.blocks), status: 'published' } });
      } else {
        await prisma.page.create({ data: { slug, title: fresh.title, metaTitle: fresh.metaTitle, metaDescription: fresh.metaDescription, blocks: JSON.stringify(fresh.blocks), status: 'published' } });
      }
    }
    await prisma.setting.create({ data: { key, value: new Date().toISOString() } });
    console.log(`✔ Updated pages: ${up.slugs.join(', ')}`);
  }
}

/* Once per website: add new blog articles that are not there yet (existing posts are never touched),
   and hide sample reviews that cannot be traced to a real client (they stay in Admin → Testimonials). */
const CONTENT_UPGRADES = ['2026-10-articles', '2026-10-no-awards', '2026-10-articles-2', '2026-10-archive'];
const REMOVE_STATS = ['Awards won'];
const UNVERIFIED_REVIEWS = ['Markus Schneider', 'Priya Mehta', 'Sofia Romano'];
/** Removes number tiles (e.g. "Awards won") from every page, and the same tile from each saved translation */
async function removeStats() {
  for (const page of await prisma.page.findMany()) {
    const blocks = JSON.parse(page.blocks || '[]');
    const cut = []; // [blockId, index]
    for (const b of blocks) {
      if (b?.type !== 'stats' || !Array.isArray(b.data?.items)) continue;
      b.data.items.forEach((it, i) => { if (REMOVE_STATS.includes(it?.label)) cut.push([b.id, i]); });
    }
    if (!cut.length) continue;
    const strip = (list) => list.map((b) => {
      const c = cut.filter(([id]) => id === b?.id).map(([, i]) => i).sort((x, y) => y - x);
      if (c.length && Array.isArray(b.data?.items)) for (const i of c) b.data.items.splice(i, 1);
      return b;
    });
    await prisma.page.update({ where: { id: page.id }, data: { blocks: JSON.stringify(strip(blocks)) } });
    for (const t of await prisma.translation.findMany({ where: { entity: 'page', entityId: page.id } })) {
      try {
        const d = JSON.parse(t.data);
        if (Array.isArray(d.blocks)) { d.blocks = strip(d.blocks); await prisma.translation.update({ where: { id: t.id }, data: { data: JSON.stringify(d) } }); }
      } catch {}
    }
  }
}

/* Once per website: show the real Google reviews (prisma/google-reviews.json) instead of the sample ones,
   and correct the Google rating shown on pages to the real figure (4.8 from 38 reviews). */
const REVIEW_UPGRADE = 'upgrade:2026-10-google-reviews';
const RATING_FIXES = [
  ['4.9 Google rating, verified by Trust Index', '4.8 Google rating from 38 reviews'],
  ['rated 4.9/5 on Google', 'rated 4.8/5 on Google'],
  ['"value":"4.9"', '"value":"4.8"'],
  ['Thousands of clients now hold long-term UAE residency through our desk. Reviews verified by Trust Index on Google.', 'Real reviews from our clients, published on our Google Business profile.'],
];
/* Small blog categories folded into the main ones so the blog tabs stay tidy */
const CATEGORY_MERGE = { 'Family Visa': 'Family', Relocation: 'Family', Policy: 'Golden Visa' };
async function applyReviewUpgrade() {
  if ((await prisma.page.count()) === 0) return;
  if (await prisma.setting.findUnique({ where: { key: REVIEW_UPGRADE } })) return;
  const file = path.join(__dirname, 'google-reviews.json');
  if (existsSync(file)) {
    const reviews = JSON.parse(readFileSync(file, 'utf8'));
    await prisma.testimonial.updateMany({ data: { active: false } });
    for (const [i, r] of reviews.entries()) {
      const found = await prisma.testimonial.findFirst({ where: { name: r.name, role: 'Google review' } });
      const data = { name: r.name, role: 'Google review', country: null, rating: 5, text: r.text, order: i + 1, active: true };
      if (found) await prisma.testimonial.update({ where: { id: found.id }, data });
      else await prisma.testimonial.create({ data });
    }
    console.log(`✔ Showing ${reviews.length} Google reviews`);
  }
  const fix = (s) => RATING_FIXES.reduce((acc, [a, b]) => acc.split(a).join(b), s);
  for (const page of await prisma.page.findMany()) {
    const next = fix(page.blocks || '');
    if (next === page.blocks) continue;
    await prisma.page.update({ where: { id: page.id }, data: { blocks: next } });
    // automatic translations of this page are rebuilt from the corrected English
    await prisma.translation.deleteMany({ where: { entity: 'page', entityId: page.id, status: 'auto' } });
  }
  for (const f of await prisma.faq.findMany()) {
    const q = fix(f.question), a = fix(f.answer);
    if (q !== f.question || a !== f.answer) {
      await prisma.faq.update({ where: { id: f.id }, data: { question: q, answer: a } });
      await prisma.translation.deleteMany({ where: { entity: 'faq', entityId: f.id, status: 'auto' } });
    }
  }
  for (const [from, to] of Object.entries(CATEGORY_MERGE)) {
    const posts = await prisma.post.findMany({ where: { category: from }, select: { id: true } });
    if (!posts.length) continue;
    await prisma.post.updateMany({ where: { category: from }, data: { category: to } });
    await prisma.translation.deleteMany({ where: { entity: 'post', entityId: { in: posts.map((p) => p.id) }, status: 'auto' } });
  }
  await prisma.setting.create({ data: { key: REVIEW_UPGRADE, value: new Date().toISOString() } });
}

async function applyContentUpgrades() {
  if ((await prisma.page.count()) === 0) return;
  for (const id of CONTENT_UPGRADES) {
    const key = 'upgrade:' + id;
    if (await prisma.setting.findUnique({ where: { key } })) continue;
    let added = 0;
    for (const p of C.posts) {
      if (await prisma.post.findUnique({ where: { slug: p.slug } })) continue;
      await prisma.post.create({ data: { ...p, publishedAt: new Date(p.publishedAt), author: 'Golden Visa UAE', status: 'published' } });
      added++;
    }
    await prisma.testimonial.updateMany({ where: { name: { in: UNVERIFIED_REVIEWS } }, data: { active: false } }).catch(() => {});
    await removeStats().catch((e) => console.error('remove stats', e.message));
    await prisma.setting.create({ data: { key, value: new Date().toISOString() } });
    console.log(`✔ Added ${added} new articles`);
  }
}

/* prisma/translations/<lang>.json = { "plain": { english: translation }, "html": { englishHtml: translationHtml } }
   Loaded into the translation memory once per file version. */
async function loadTranslationPacks() {
  const dir = path.join(__dirname, 'translations');
  if (!existsSync(dir)) return;
  const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const locale = file.replace('.json', '');
    const raw = readFileSync(path.join(dir, file), 'utf8');
    const version = sha1(raw);
    const flag = await prisma.setting.findUnique({ where: { key: 'pack:' + locale } });
    if (flag?.value === version) continue;
    let pack;
    try {
      pack = JSON.parse(raw);
    } catch (e) {
      console.error('Bad translation file', file, e.message);
      continue;
    }
    const rows = [];
    for (const part of ['plain', 'html']) {
      for (const [en, tr] of Object.entries(pack[part] || {})) if (en && typeof tr === 'string' && tr.trim()) rows.push({ key: `pack:${locale}:${sha1(en)}`, text: tr });
    }
    await prisma.translationMemory.deleteMany({ where: { key: { startsWith: `pack:${locale}:` } } });
    const seen = new Set();
    const unique = rows.filter((r) => (seen.has(r.key) ? false : seen.add(r.key)));
    for (let i = 0; i < unique.length; i += 400) await prisma.translationMemory.createMany({ data: unique.slice(i, i + 400) });
    // New built-in translations: automatic translations (not hand-edited ones) are rebuilt on their next visit
    await prisma.translation.deleteMany({ where: { locale, status: 'auto' } }).catch(() => {});
    await prisma.setting.upsert({ where: { key: 'pack:' + locale }, update: { value: version }, create: { key: 'pack:' + locale, value: version } });
    console.log(`✔ Built-in ${locale.toUpperCase()} translations: ${unique.length} texts`);
  }
}

main()
  .then(() => console.log('Seed finished.'))
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
