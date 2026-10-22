// Server-side config for the generic admin CRUD API (/api/admin/[resource])
type FieldKind = 'string' | 'int' | 'bool' | 'date' | 'json';

export type ResourceConfig = {
  model: string;
  search: string[];
  orderBy: any;
  fields: Record<string, FieldKind>;
  required?: string[];
  adminOnly?: boolean;
  unique?: string; // slug-like field to auto-generate
  select?: any;
  filters?: string[];
};

export const RESOURCES: Record<string, ResourceConfig> = {
  pages: {
    model: 'page',
    search: ['title', 'slug'],
    orderBy: { updatedAt: 'desc' },
    fields: { title: 'string', slug: 'string', metaTitle: 'string', metaDescription: 'string', ogImage: 'string', blocks: 'json', status: 'string', inMenu: 'bool' },
    required: ['title', 'slug'],
    unique: 'slug',
    filters: ['status'],
  },
  posts: {
    model: 'post',
    search: ['title', 'slug', 'category'],
    orderBy: { publishedAt: 'desc' },
    fields: {
      title: 'string',
      slug: 'string',
      excerpt: 'string',
      content: 'string',
      cover: 'string',
      category: 'string',
      tags: 'string',
      author: 'string',
      status: 'string',
      metaTitle: 'string',
      metaDescription: 'string',
      publishedAt: 'date',
    },
    required: ['title', 'slug'],
    unique: 'slug',
    filters: ['status', 'category'],
  },
  services: {
    model: 'service',
    search: ['title', 'subtitle'],
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
    fields: { title: 'string', slug: 'string', subtitle: 'string', description: 'string', price: 'string', icon: 'string', image: 'string', link: 'string', category: 'string', featured: 'bool', active: 'bool', order: 'int' },
    required: ['title'],
    filters: ['category'],
  },
  faqs: {
    model: 'faq',
    search: ['question', 'answer', 'group'],
    orderBy: [{ group: 'asc' }, { order: 'asc' }],
    fields: { question: 'string', answer: 'string', group: 'string', order: 'int', active: 'bool' },
    required: ['question', 'answer'],
    filters: ['group'],
  },
  testimonials: {
    model: 'testimonial',
    search: ['name', 'text', 'country'],
    orderBy: { order: 'asc' },
    fields: { name: 'string', role: 'string', country: 'string', rating: 'int', text: 'string', avatar: 'string', order: 'int', active: 'bool' },
    required: ['name', 'text'],
  },
  partners: {
    model: 'partner',
    search: ['name'],
    orderBy: { order: 'asc' },
    fields: { name: 'string', logo: 'string', url: 'string', order: 'int', active: 'bool' },
    required: ['name'],
  },
  leads: {
    model: 'lead',
    search: ['name', 'email', 'phone', 'service', 'message'],
    orderBy: { createdAt: 'desc' },
    fields: { name: 'string', email: 'string', phone: 'string', nationality: 'string', service: 'string', message: 'string', source: 'string', status: 'string', notes: 'string', seen: 'bool' },
    required: ['name'],
    filters: ['status', 'service'],
  },
  subscribers: {
    model: 'subscriber',
    search: ['email'],
    orderBy: { createdAt: 'desc' },
    fields: { email: 'string' },
    required: ['email'],
  },
  users: {
    model: 'user',
    search: ['name', 'email', 'phone'],
    orderBy: { createdAt: 'desc' },
    fields: { name: 'string', email: 'string', phone: 'string', nationality: 'string', role: 'string', active: 'bool' },
    required: ['name', 'email'],
    adminOnly: true,
    filters: ['role'],
    select: { id: true, name: true, email: true, phone: true, nationality: true, role: true, active: true, lastLoginAt: true, createdAt: true, _count: { select: { applications: true } } },
  },
  media: {
    model: 'media',
    search: ['filename', 'alt'],
    orderBy: { createdAt: 'desc' },
    fields: { alt: 'string' },
  },
  applications: {
    model: 'application',
    search: ['refNo', 'fullName', 'email', 'phone', 'service', 'passportNo'],
    orderBy: { createdAt: 'desc' },
    fields: { status: 'string', progress: 'int', adminNote: 'string', seen: 'bool', service: 'string' },
    filters: ['status', 'service'],
  },
};

export function cleanData(cfg: ResourceConfig, body: any, partial = false) {
  const out: any = {};
  for (const [k, kind] of Object.entries(cfg.fields)) {
    if (!(k in body)) continue;
    let v = body[k];
    if (kind === 'int') v = v === '' || v === null ? 0 : parseInt(v, 10) || 0;
    else if (kind === 'bool') v = v === true || v === 'true' || v === 1 || v === '1' || v === 'on';
    else if (kind === 'date') v = v ? new Date(v) : new Date();
    else if (kind === 'json') v = typeof v === 'string' ? v : JSON.stringify(v ?? []);
    else v = v === null || v === undefined ? null : String(v);
    out[k] = v;
  }
  if (!partial) {
    for (const r of cfg.required || []) {
      if (out[r] === undefined || out[r] === null || out[r] === '') throw new Error(`${r} is required`);
    }
  }
  return out;
}
