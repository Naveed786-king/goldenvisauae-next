'use client';
import { useEffect, useState } from 'react';
import { Save, Send, Globe, Phone, Share2, Palette, Search, CodeXml, Mail, ToggleLeft } from 'lucide-react';
import type { Field } from '@/components/blocks/types';
import { FieldGroup } from './FieldInput';
import { Btn, Card, PageTitle, Spinner, api, toast } from './ui';
import { cn } from '@/lib/utils';
import { PartDesignCard } from './DesignEditors';

export function useSetting<T = any>(key: string) {
  const [value, setValue] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api<{ value: T }>(`/api/admin/settings/${key}`)
      .then((d) => setValue(d.value))
      .catch((e) => toast(e.message, 'error'));
  }, [key]);
  async function save(v?: T) {
    setSaving(true);
    try {
      await api(`/api/admin/settings/${key}`, 'PUT', { value: v ?? value });
      toast('Saved — website updated');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }
  return { value, setValue, save, saving };
}

const linkList = (name: string, label: string, withDesc = false, withChildren = false): Field => ({
  name,
  label,
  type: 'list',
  itemLabel: 'Link',
  fields: [
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'href', label: 'Link (/page, https://…, whatsapp, phone)', type: 'text' },
    ...(withDesc ? [{ name: 'description', label: 'Description (dropdown only)', type: 'text' } as Field] : []),
    ...(withChildren
      ? [
          {
            name: 'children',
            label: 'Dropdown items',
            type: 'list',
            itemLabel: 'Sub-link',
            fields: [
              { name: 'label', label: 'Label', type: 'text' },
              { name: 'href', label: 'Link', type: 'text' },
              { name: 'description', label: 'Short description', type: 'text' },
            ],
          } as Field,
        ]
      : []),
  ],
});

/* ---------------- Header ---------------- */
export function HeaderEditor() {
  const { value, setValue, save, saving } = useSetting<any>('header');
  if (!value) return <Spinner />;
  return (
    <div className="max-w-4xl">
      <PageTitle
        title="Header & menu"
        subtitle="Logo is set in Site settings. Drag items to reorder, add dropdowns under any menu item."
        actions={
          <Btn onClick={() => save()} loading={saving}>
            <Save className="h-4 w-4" /> Save
          </Btn>
        }
      />
      <div className="space-y-6">
        <Card title="Main menu" className="p-0">
          <div className="p-5">
            <FieldGroup fields={[linkList('menu', 'Menu items', false, true)]} data={value} onChange={setValue} />
          </div>
        </Card>
        <Card title="Services mega menu" className="p-0">
          <div className="p-5">
            <p className="mb-4 text-xs text-gray-500">The big panel that opens when visitors hover the menu item below (desktop). On phones the same links appear grouped in the menu. Texts are translated into all languages after saving.</p>
            <FieldGroup
              fields={[
                { name: 'enabled', label: 'Show the mega menu', type: 'boolean', half: true },
                { name: 'attachTo', label: 'Opens from the menu item with link', type: 'text', half: true, help: 'e.g. /services' },
                { name: 'eyebrow', label: 'Small heading', type: 'text', half: true },
                { name: 'title', label: 'Title', type: 'text', half: true },
                { name: 'text', label: 'Text', type: 'textarea' },
                { name: 'bullets', label: 'Check marks (one per line)', type: 'lines' },
                {
                  name: 'groups',
                  label: 'Columns',
                  type: 'list',
                  itemLabel: 'Column',
                  fields: [
                    { name: 'title', label: 'Column title', type: 'text' },
                    {
                      name: 'links',
                      label: 'Links',
                      type: 'list',
                      itemLabel: 'Link',
                      fields: [
                        { name: 'label', label: 'Label', type: 'text', half: true },
                        { name: 'href', label: 'Link', type: 'text', half: true },
                        { name: 'icon', label: 'Icon', type: 'icon' },
                      ],
                    },
                  ],
                },
                { name: 'calculatorLabel', label: 'Calculator button', type: 'text', half: true },
                { name: 'calculatorHref', label: 'Calculator link', type: 'text', half: true },
                { name: 'allLabel', label: '“All services” link text', type: 'text', half: true },
                { name: 'allHref', label: '“All services” link', type: 'text', half: true },
              ]}
              data={value.mega || {}}
              onChange={(m) => setValue({ ...value, mega: m })}
            />
          </div>
        </Card>
        <Card title="Header button" className="p-0">
          <div className="p-5">
            <FieldGroup
              fields={[
                { name: 'cta', label: 'Call-to-action button', type: 'link' },
                { name: 'showLogin', label: 'Show client login icon', type: 'boolean' },
              ]}
              data={value}
              onChange={setValue}
            />
          </div>
        </Card>
        <PartDesignCard part="header" />
        <Card title="Top announcement bar" className="p-0">
          <div className="p-5">
            <FieldGroup
              fields={[
                { name: 'enabled', label: 'Show top bar', type: 'boolean' },
                { name: 'text', label: 'Text', type: 'text' },
                { name: 'linkLabel', label: 'Link text', type: 'text' },
                { name: 'linkHref', label: 'Link URL', type: 'text' },
              ]}
              data={value.topbar}
              onChange={(t) => setValue({ ...value, topbar: t })}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Footer ---------------- */
export function FooterEditor() {
  const { value, setValue, save, saving } = useSetting<any>('footer');
  if (!value) return <Spinner />;
  return (
    <div className="max-w-4xl">
      <PageTitle
        title="Footer"
        subtitle="Contact details & social links in the footer come from Site settings."
        actions={
          <Btn onClick={() => save()} loading={saving}>
            <Save className="h-4 w-4" /> Save
          </Btn>
        }
      />
      <div className="space-y-6">
        <Card title="Call-to-action strip" className="p-0">
          <div className="p-5">
            <FieldGroup
              fields={[
                { name: 'ctaTitle', label: 'Title', type: 'text' },
                { name: 'ctaHighlight', label: 'Highlighted words', type: 'text' },
                { name: 'ctaButton', label: 'Button', type: 'link' },
              ]}
              data={value}
              onChange={setValue}
            />
          </div>
        </Card>
        <Card title="About & link columns" className="p-0">
          <div className="p-5">
            <FieldGroup
              fields={[
                { name: 'about', label: 'About text', type: 'textarea' },
                {
                  name: 'columns',
                  label: 'Link columns',
                  type: 'list',
                  itemLabel: 'Column',
                  fields: [{ name: 'title', label: 'Column title', type: 'text' }, linkList('links', 'Links')],
                },
              ]}
              data={value}
              onChange={setValue}
            />
          </div>
        </Card>
        <Card title="Newsletter" className="p-0">
          <div className="p-5">
            <FieldGroup
              fields={[
                { name: 'enabled', label: 'Show newsletter signup', type: 'boolean' },
                { name: 'title', label: 'Title', type: 'text' },
                { name: 'text', label: 'Text', type: 'text' },
              ]}
              data={value.newsletter}
              onChange={(n) => setValue({ ...value, newsletter: n })}
            />
          </div>
        </Card>
        <PartDesignCard part="footer" />
        <Card title="Bottom bar" className="p-0">
          <div className="p-5">
            <FieldGroup
              fields={[
                { name: 'copyright', label: 'Copyright ({year} = current year)', type: 'text' },
                linkList('bottomLinks', 'Bottom links'),
                { name: 'disclaimer', label: 'Disclaimer', type: 'textarea' },
              ]}
              data={value}
              onChange={setValue}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Site settings ---------------- */
const TABS = [
  { k: 'general', label: 'General & logo', icon: Globe },
  { k: 'contact', label: 'Contact details', icon: Phone },
  { k: 'social', label: 'Social media', icon: Share2 },
  { k: 'theme', label: 'Brand colours', icon: Palette },
  { k: 'seo', label: 'SEO', icon: Search },
  { k: 'features', label: 'Features', icon: ToggleLeft },
  { k: 'scripts', label: 'Tracking & scripts', icon: CodeXml },
  { k: 'email', label: 'Email (SMTP)', icon: Mail },
] as const;

export function SiteSettingsEditor() {
  const { value, setValue, save, saving } = useSetting<any>('site');
  const smtp = useSetting<any>('smtp');
  const [tab, setTab] = useState<(typeof TABS)[number]['k']>('general');
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  if (!value) return <Spinner />;

  const nested = (key: string, fields: Field[]) => <FieldGroup fields={fields} data={value[key]} onChange={(v) => setValue({ ...value, [key]: v })} />;

  return (
    <div>
      <PageTitle
        title="Site settings"
        subtitle="Changes apply to the whole website immediately after saving."
        actions={
          tab !== 'email' ? (
            <Btn onClick={() => save()} loading={saving}>
              <Save className="h-4 w-4" /> Save settings
            </Btn>
          ) : (
            <Btn onClick={() => smtp.save()} loading={smtp.saving}>
              <Save className="h-4 w-4" /> Save email settings
            </Btn>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={cn('flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition', tab === t.k ? 'bg-ink text-white' : 'text-gray-600 hover:bg-white')}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
        <Card className="p-6 max-w-3xl">
          {tab === 'general' && (
            <FieldGroup
              fields={[
                { name: 'name', label: 'Website name', type: 'text' },
                { name: 'tagline', label: 'Tagline', type: 'text' },
                { name: 'logo', label: 'Logo (for dark header) — leave empty to use the built-in text logo', type: 'image' },
                { name: 'logoLight', label: 'Alternative logo (optional)', type: 'image' },
                { name: 'favicon', label: 'Favicon / app icon (square PNG, 512×512)', type: 'image' },
              ]}
              data={value}
              onChange={setValue}
            />
          )}
          {tab === 'contact' && (
            <FieldGroup
              fields={[
                { name: 'phone', label: 'Phone (for calling, e.g. +971566556645)', type: 'text' },
                { name: 'phoneDisplay', label: 'Phone as displayed', type: 'text' },
                { name: 'whatsapp', label: 'WhatsApp number (digits only, with country code)', type: 'text' },
                { name: 'whatsappMessage', label: 'WhatsApp pre-filled message', type: 'text' },
                { name: 'emailGeneral', label: 'General email', type: 'text' },
                { name: 'emailVisa', label: 'Visa enquiries email', type: 'text' },
                { name: 'address', label: 'Office address', type: 'textarea' },
                { name: 'poBox', label: 'P.O. Box', type: 'text' },
                { name: 'hours', label: 'Opening hours', type: 'text' },
                { name: 'hoursClosed', label: 'Closed days', type: 'text' },
                { name: 'mapUrl', label: 'Google Maps link', type: 'text' },
                { name: 'mapEmbed', label: 'Google Maps embed URL (src of the iframe)', type: 'text' },
              ]}
              data={value}
              onChange={setValue}
            />
          )}
          {tab === 'social' &&
            nested('social', [
              { name: 'facebook', label: 'Facebook URL', type: 'text' },
              { name: 'instagram', label: 'Instagram URL', type: 'text' },
              { name: 'youtube', label: 'YouTube URL', type: 'text' },
              { name: 'twitter', label: 'X / Twitter URL', type: 'text' },
              { name: 'linkedin', label: 'LinkedIn URL', type: 'text' },
              { name: 'tiktok', label: 'TikTok URL', type: 'text' },
            ])}
          {tab === 'theme' && (
            <div className="space-y-5">
              {(
                [
                  ['gold', 'Gold (main accent)'],
                  ['goldLight', 'Light gold'],
                  ['ink', 'Dark navy (backgrounds)'],
                  ['sand', 'Sand (light sections)'],
                ] as const
              ).map(([k, l]) => (
                <div key={k} className="flex items-center gap-4">
                  <input type="color" value={value.colors[k]} onChange={(e) => setValue({ ...value, colors: { ...value.colors, [k]: e.target.value } })} className="h-12 w-16 cursor-pointer rounded-lg border border-gray-200" />
                  <div className="flex-1">
                    <label className="admin-label">{l}</label>
                    <input className="admin-input font-mono" value={value.colors[k]} onChange={(e) => setValue({ ...value, colors: { ...value.colors, [k]: e.target.value } })} />
                  </div>
                </div>
              ))}
              <div className="rounded-2xl p-6" style={{ background: value.colors.ink }}>
                <p style={{ color: value.colors.goldLight }} className="text-xs font-bold uppercase tracking-widest">Preview</p>
                <p className="mt-2 text-2xl font-bold text-white">Your Golden Visa journey</p>
                <span className="mt-4 inline-block rounded-full px-5 py-2 text-sm font-bold" style={{ background: value.colors.gold, color: value.colors.ink }}>
                  Apply now
                </span>
                <div className="mt-4 rounded-xl p-3 text-sm" style={{ background: value.colors.sand, color: value.colors.ink }}>
                  Light section background
                </div>
              </div>
              <Btn
                variant="outline"
                onClick={() => setValue({ ...value, colors: { gold: '#C8A255', goldLight: '#E9D5A6', ink: '#0A1222', sand: '#F7F2E9' } })}
              >
                Reset to default colours
              </Btn>
            </div>
          )}
          {tab === 'seo' &&
            nested('seo', [
              { name: 'defaultTitle', label: 'Default page title (home)', type: 'text' },
              { name: 'titleTemplate', label: 'Title template (%s = page title)', type: 'text' },
              { name: 'description', label: 'Default meta description', type: 'textarea' },
              { name: 'keywords', label: 'Keywords (comma separated)', type: 'text' },
              { name: 'ogImage', label: 'Default social share image (1200×630)', type: 'image' },
              { name: 'googleVerification', label: 'Google Search Console verification code', type: 'text', help: 'Search Console → Add property → HTML tag → copy only the content="…" value. Then submit /sitemap.xml there so Google indexes new posts fast.' },
              { name: 'bingVerification', label: 'Bing Webmaster verification code (optional)', type: 'text', help: 'New posts are sent to Bing automatically (IndexNow).' },
            ])}
          {tab === 'features' && (
            <FieldGroup
              fields={[
                { name: 'showWhatsappButton', label: 'Floating WhatsApp button', type: 'boolean' },
                { name: 'showMobileBar', label: 'Mobile bottom bar (Call / WhatsApp)', type: 'boolean' },
                { name: 'showPreloader', label: 'Animated preloader on first visit', type: 'boolean' },
              ]}
              data={value}
              onChange={setValue}
            />
          )}
          {tab === 'scripts' && (
            <FieldGroup
              fields={[
                { name: 'headScripts', label: 'Code in <head> (Google Analytics, Tag Manager, Meta Pixel, Search Console verification…)', type: 'textarea' },
                { name: 'bodyScripts', label: 'Code at end of <body> (chat widgets etc.)', type: 'textarea' },
              ]}
              data={value}
              onChange={setValue}
            />
          )}
          {tab === 'email' &&
            (smtp.value ? (
              <div className="space-y-6">
                <div className="rounded-2xl bg-gray-50 p-5 ring-1 ring-gray-200/70">
                  <p className="text-sm font-extrabold">Notification emails</p>
                  <p className="mt-1 text-xs text-gray-500">Who gets an email when something happens on the website. Add one or more addresses — one per line or separated by commas.</p>
                  <div className="mt-4">
                    <FieldGroup
                      fields={[{ name: 'notifyEmail', label: 'Send website notifications to', type: 'textarea', help: 'Example: owner@yourdomain.com, sales@yourdomain.com. Empty = the visa enquiries email from the Contact tab.' }]}
                      data={smtp.value}
                      onChange={smtp.setValue}
                    />
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-500">Email me about</p>
                  <div className="mt-2">
                    <FieldGroup
                      fields={[
                        { name: 'leads', label: 'New enquiries & calculator leads', type: 'boolean', half: true },
                        { name: 'applications', label: 'New online applications', type: 'boolean', half: true },
                        { name: 'messages', label: 'Client chat messages', type: 'boolean', half: true },
                        { name: 'accounts', label: 'New client accounts', type: 'boolean', half: true },
                        { name: 'subscribers', label: 'Newsletter subscribers', type: 'boolean', half: true },
                      ]}
                      data={{ leads: true, applications: true, messages: true, accounts: true, subscribers: true, ...(smtp.value.notifyOn || {}) }}
                      onChange={(v: any) => smtp.setValue({ ...smtp.value, notifyOn: v })}
                    />
                  </div>
                </div>
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  Used to email you about new leads/applications and to email clients (status updates, password reset). Get these details from your hosting email (cPanel → Email Accounts → Connect Devices), Google Workspace (smtp.gmail.com, port 465, app password) or Zoho.
                </p>
                <FieldGroup
                  fields={[
                    { name: 'host', label: 'SMTP host (e.g. mail.yourdomain.com)', type: 'text' },
                    { name: 'port', label: 'Port (465 = SSL, 587 = TLS)', type: 'number' },
                    { name: 'secure', label: 'Use SSL (turn on for port 465)', type: 'boolean' },
                    { name: 'user', label: 'Username (full email address)', type: 'text' },
                    { name: 'pass', label: 'Password', type: 'text' },
                    { name: 'from', label: 'From (e.g. Golden Visa UAE <visa@yourdomain.com>)', type: 'text' },
                  ]}
                  data={smtp.value}
                  onChange={smtp.setValue}
                />
                <div className="flex gap-2 border-t border-gray-100 pt-5">
                  <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Send test email to… (empty = all notification emails)" className="admin-input" />
                  <Btn
                    variant="dark"
                    loading={testing}
                    onClick={async () => {
                      setTesting(true);
                      try {
                        await smtp.save();
                        await api('/api/admin/test-email', 'POST', { to: testTo });
                        toast('Test email sent ✔');
                      } catch (e: any) {
                        toast(e.message, 'error');
                      } finally {
                        setTesting(false);
                      }
                    }}
                  >
                    <Send className="h-4 w-4" /> Test
                  </Btn>
                </div>
              </div>
            ) : (
              <Spinner />
            ))}
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Profile ---------------- */
export function ProfileEditor({ name, email }: { name: string; email: string }) {
  const [f, setF] = useState({ name, email, current: '', password: '' });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await api('/api/admin/me', 'PUT', f);
      toast('Profile updated');
      setF({ ...f, current: '', password: '' });
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="max-w-xl">
      <PageTitle title="My profile" />
      <Card className="p-6 space-y-4">
        <div>
          <label className="admin-label">Name</label>
          <input className="admin-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label className="admin-label">Email (login)</label>
          <input className="admin-input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-sm font-bold">Change password</p>
          <div className="grid gap-3">
            <input type="password" className="admin-input" placeholder="Current password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
            <input type="password" className="admin-input" placeholder="New password (min 8 characters)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </div>
        </div>
        <Btn onClick={save} loading={saving}>
          <Save className="h-4 w-4" /> Save
        </Btn>
      </Card>
    </div>
  );
}
