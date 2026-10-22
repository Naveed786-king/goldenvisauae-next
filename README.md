# Golden Visa UAE — Next.js website, admin panel and client portal

The Golden Visa UAE website (goldenvisauae.ai) rebuilt in **Next.js 15**. Every page, service, price, FAQ, blog post, review and calculator rule from the original site is in the database and can be edited from the admin panel. Clients can apply online, upload documents and follow their file in a portal.

Design: white background, black and gold, Apple-style system font (SF Pro on Apple devices, Inter elsewhere), glass header, 3D particle globe in the hero, tilt cards and a mobile bottom navigation bar.

---

## 1. What is included

### Public website
- **29 pages**: Home, About, Services, Contact, FAQs, Visa validity check, Official sources, Blog, Privacy, Terms, Disclaimer and **18 service pages** (`/services/golden-visa`, `/services/family-visa`, `/services/emirates-id`, `/services/maid-visa` …).
- **Cost calculator** (pop-up on every page, centre button of the mobile nav bar). 6 visa groups and 34 options with packages, family members, medical Normal/VIP, deposits and VAT, all taken from the original calculator. Results go to WhatsApp, a share link, or "email me this estimate" (saved as a lead).
- **Offer pop-up**, **visa validity check**, contact and callback forms, newsletter, floating WhatsApp, back-to-top.
- **Online application** (`/apply`): 3 steps, document upload, creates a client account.
- **Blog** with 9 articles from the original site, cover images, related posts and "load more".

### Client portal
`/register`, `/login`, `/forgot-password`, `/account`: applications with progress, status timeline, chat with your team, document upload and download. The portal refreshes itself every few seconds.

### Admin panel (`/admin`)
| Section | What you can do |
|---|---|
| Dashboard | Leads chart, applications by status, latest activity |
| Leads & enquiries | Every form, calculator estimate and visa check. Status, notes, WhatsApp/call buttons, CSV export |
| Applications / Customers / Subscribers | Manage client files, accounts and newsletter emails |
| Pages | Page builder with 35 section types (including 3D intro hero, founder, mission tabs, licence certificate and office map): add, move, hide, duplicate. Every text, image, button, table and list. SEO per page. Live preview |
| Blog posts | Rich text editor, cover image, category, tags, SEO, drafts, scheduling |
| Services & prices | The 18 services: title, summary, icon, image, category, order |
| **Cost calculator** | Every group, option, price, package, family fee, add-on and text of the calculator |
| **Offer pop-up** | Text, timing, button, on/off |
| FAQs / Testimonials / Partner logos / Media | Content lists and uploads |
| Design & style | Colours, fonts, glass strength, header and footer style, animations |
| Header & menu / Footer | Menu, mega menu, top bar, footer columns |
| Languages | Enabled languages, translation engine, per-text editing |
| Site settings | Logo, favicon, contact details, social links, SEO, tracking scripts, **Email (SMTP)** |
| Backup & move | Download / restore the whole site in one file |
| Admin users | Admins and Editors |

The bell in the admin shows new leads, applications and client messages as they arrive, with a sound.

---

## 2. Run it on your computer

You need [Node.js 20 or 22](https://nodejs.org).

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run setup                 # creates the database, all content and the admin account
npm run dev
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin (login `admin@goldenvisauae.ai` / `Admin@12345`, change it in Admin → My profile)

---

## 3. `.env` for production

```env
DATABASE_URL="file:./data.db"                 # SQLite (default). MySQL/PostgreSQL also work, see section 6
JWT_SECRET="long-random-secret"               # required
NEXT_PUBLIC_SITE_URL="https://goldenvisauae.ai"
ADMIN_EMAIL="you@goldenvisauae.ai"
ADMIN_PASSWORD="YourStrongPassword123"
UPLOAD_DIR="uploads"
```

Make a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

---

## 4. Hosting on a VPS with xCloud (recommended)

xCloud manages the server (Nginx, SSL, deploys from GitHub) on your own VPS.

1. In xCloud, add your VPS (Ubuntu 22.04/24.04, 2 GB RAM or more) and create a **Node.js site** for `goldenvisauae.ai`.
2. Connect this GitHub repository, branch `main`.
3. Settings:
   - Node version: **22**
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Port: **3000**
4. Add the environment variables from section 3.
5. Deploy. The first start creates the database, loads all content and creates the admin account.
6. **SSL**: in xCloud → site → SSL → **Let's Encrypt** for `goldenvisauae.ai` and `www.goldenvisauae.ai`. If you use Cloudflare, keep the proxy off while issuing, then set SSL/TLS to **Full (strict)**.

Data that must survive deploys: `prisma/data.db` and `uploads/`. Both are ignored by git, so deploys never overwrite them.

### Plain VPS without xCloud

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs nginx git
npm install -g pm2
cd /var/www && git clone https://github.com/OWNER/REPO.git goldenvisauae && cd goldenvisauae
cp .env.example .env && nano .env
npm install && npm run build
pm2 start ecosystem.config.js && pm2 save && pm2 startup
```

Nginx (`/etc/nginx/sites-available/goldenvisauae`):

```nginx
server {
    server_name goldenvisauae.ai www.goldenvisauae.ai;
    client_max_body_size 20M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
ln -s /etc/nginx/sites-available/goldenvisauae /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d goldenvisauae.ai -d www.goldenvisauae.ai
```

DNS: an **A record** for `@` and `www` pointing to the VPS IP.

---

## 5. cPanel / Hostinger "Node.js App"

1. Upload the project and create the app: Node **20+**, startup file **`server.js`**.
2. Add the environment variables from section 3, click **Run NPM Install**.
3. In the cPanel terminal (inside the app's virtual environment): `npm run build`, then **Restart**.

---

## 6. MySQL or PostgreSQL instead of SQLite

Set `DATABASE_URL="mysql://USER:PASS@localhost:3306/DB"` (or a `postgresql://` URL) and run `npm run build`. The database type is picked from the URL.

---

## 7. After going live

1. Admin → **My profile**: change the admin email and password.
2. Admin → **Site settings**: upload the **logo** and **favicon** (until then a text logo is shown), check phone, WhatsApp, emails and address.
3. Admin → **Partner logos**: upload the government department logos (the 16 names are already there).
4. Site settings → **Email (SMTP)** → fill in and press **Test**. Without this the site works but sends no emails. Lead alerts go to the address under *Notification emails*.
5. Admin → **Testimonials** and **Offer pop-up**: check the reviews and offer wording (they come from the old site; make sure every claim is accurate).
6. Site settings → **Tracking & scripts**: Google Analytics / Tag Manager / Meta Pixel.
7. Google Search Console, see section 9.

---

## 8. Languages

English at `/`, plus Arabic (right-to-left) `/ar`, Russian `/ru`, Turkish `/tr`, Chinese `/zh`, French `/fr`, German `/de`, Spanish `/es`, Romanian `/ro`, Hindi `/hi`.

- **Arabic and Russian** come with built-in human translations of every page, service, FAQ, the calculator and the blog (`prisma/translations/ar.json`, `ru.json`, ~3,500 texts each). They work with no key and no internet.
- **The other 8 languages** are translated automatically by the free Google engine (default, no key). For better quality: Admin → **Languages** → engine **Google Gemini** (key from aistudio.google.com/apikey), Claude or DeepL.
- New or edited text is translated in the background after you save. Every translation can be corrected by hand in Admin → Languages.

## 9. SEO and Google indexing

Built in, nothing to set up:
- `sitemap.xml` with every page in every language and `hreflang` links, `robots.txt`, RSS at `/feed.xml`.
- Canonical and `hreflang` tags, Open Graph, Twitter cards, `ProfessionalService`, `BlogPosting`, `BreadcrumbList` and `FAQPage` structured data.
- New and updated pages and posts are sent to Bing and Yandex instantly with **IndexNow**.

Google Search Console:
1. search.google.com/search-console → **Add property** → URL prefix `https://goldenvisauae.ai`.
2. Choose **HTML tag**, copy only the `content="…"` value → Admin → Site settings → **SEO** → Google verification code → Save → **Verify**.
3. **Sitemaps** → `sitemap.xml` → **Submit**. Google re-reads it on its own after that.

---

## 10. Everyday use

- **Edit a page:** Admin → Pages → Edit → click a section → change → Save (Ctrl+S). Live in seconds.
- **Change calculator prices:** Admin → Cost calculator.
- **Reset content to the original:** `npm run seed:reset` (keeps users, leads and applications).
- **Forgot admin password:** `node prisma/create-admin.mjs you@email.com "NewPassword123" "Your Name"` on the server.

## 11. Backups

Back up `prisma/data.db` (or your MySQL database) and `uploads/`, or use Admin → **Backup & move** to download everything in one file.

## 12. Updating

Push to `main` and redeploy in xCloud. On a plain VPS: `git pull && npm install && npm run build && pm2 restart goldenvisauae`.

## 13. Tech stack

Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · Prisma (SQLite / MySQL / PostgreSQL) · JWT sessions (httpOnly cookies, bcrypt) · Nodemailer · next-intl · Lucide icons.

```
prisma/              schema, seed, content.mjs (all site content), translations/ (AR + RU)
src/app/(site)/      public pages, apply, login, client portal
src/app/admin/       admin panel
src/app/api/         API routes
src/components/      blocks (page sections), site (header, footer, calculator), admin, portal
src/lib/             database, auth, settings, fees, email, i18n, SEO
```

## 14. Troubleshooting

| Problem | Fix |
|---|---|
| Logged out often | Set a long `JWT_SECRET`, restart |
| Images don't upload | `uploads/` must be writable; Nginx `client_max_body_size 20M` |
| No emails | Site settings → Email (SMTP) → Test; port 465 + SSL or 587 without SSL |
| 502 Bad Gateway | `pm2 logs goldenvisauae`, then `pm2 restart goldenvisauae` |
| Certificate warning | Issue Let's Encrypt in xCloud for both `goldenvisauae.ai` and `www.` |
