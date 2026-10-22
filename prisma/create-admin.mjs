// Create or reset an admin account from the command line:
//   node prisma/create-admin.mjs you@example.com "YourStrongPassword" "Your Name"
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'fs';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const [email, password, name = 'Administrator'] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.log('Usage: node prisma/create-admin.mjs email "password(min 8)" "Name"');
  process.exit(1);
}
const prisma = new PrismaClient();
const hash = await bcrypt.hash(password, 10);
await prisma.user.upsert({
  where: { email: email.toLowerCase() },
  update: { passwordHash: hash, role: 'ADMIN', active: true, name },
  create: { email: email.toLowerCase(), passwordHash: hash, role: 'ADMIN', name },
});
console.log(`✔ Admin ready: ${email}`);
await prisma.$disconnect();
