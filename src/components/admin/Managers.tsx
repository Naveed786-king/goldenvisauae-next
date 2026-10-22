'use client';
import { Star } from 'lucide-react';
import ResourceManager from './ResourceManager';
import { Icon } from '@/components/ui/Icon';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Field } from '@/components/blocks/types';

const yes = (v: boolean) => <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{v ? 'Active' : 'Hidden'}</span>;

export function ServicesManager() {
  const fields: Field[] = [
    { name: 'title', label: 'Service name', type: 'text' },
    { name: 'subtitle', label: 'Subtitle (e.g. Duration 10 years)', type: 'text' },
    { name: 'description', label: 'Short description', type: 'textarea' },
    { name: 'price', label: 'Price (e.g. AED 15,000)', type: 'text' },
    { name: 'icon', label: 'Icon', type: 'icon' },
    { name: 'image', label: 'Image (optional, replaces icon)', type: 'image' },
    { name: 'link', label: '"Know more" link (e.g. /ras-al-khaimah-property-golden-visa)', type: 'text' },
    {
      name: 'category',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'main', label: 'Main service (with price)' },
        { value: 'additional', label: 'Additional service' },
      ],
    },
    { name: 'order', label: 'Sort order (smaller = first)', type: 'number' },
    { name: 'featured', label: 'Mark as popular', type: 'boolean' },
    { name: 'active', label: 'Show on website', type: 'boolean' },
  ];
  return (
    <ResourceManager
      config={{
        resource: 'services',
        title: 'Services & prices',
        subtitle: 'Shown wherever a "Services grid" section is used.',
        singular: 'Service',
        fields,
        defaults: { category: 'main', active: true, order: 0, icon: 'badge' },
        filters: [{ key: 'category', label: 'Types', options: [{ value: 'main', label: 'Main' }, { value: 'additional', label: 'Additional' }] }],
        pageSize: 50,
        columns: [
          {
            key: 'title',
            label: 'Service',
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-gold">
                  <Icon name={r.icon} className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-400">{r.subtitle}</p>
                </div>
              </div>
            ),
          },
          { key: 'price', label: 'Price', render: (r) => <span className="font-bold text-gold-deep">{r.price || '—'}</span> },
          { key: 'category', label: 'Type', className: 'hidden md:table-cell capitalize' },
          { key: 'order', label: 'Order', className: 'hidden md:table-cell' },
          { key: 'active', label: 'Status', render: (r) => yes(r.active) },
        ],
      }}
    />
  );
}

export function FaqsManager() {
  return (
    <ResourceManager
      config={{
        resource: 'faqs',
        title: 'FAQs',
        subtitle: 'Group FAQs (home, investor, retirement…) and choose the group in any FAQ section.',
        singular: 'FAQ',
        pageSize: 50,
        defaults: { group: 'home', active: true, order: 0 },
        filters: [
          {
            key: 'group',
            label: 'Groups',
            options: [
              { value: 'home', label: 'Home' },
              { value: 'investor', label: 'Investor visa' },
              { value: 'retirement', label: 'Retirement visa' },
            ],
          },
        ],
        fields: [
          { name: 'question', label: 'Question', type: 'text' },
          { name: 'answer', label: 'Answer', type: 'richtext' },
          { name: 'group', label: 'Group', type: 'text', help: 'e.g. home, investor, retirement' },
          { name: 'order', label: 'Sort order', type: 'number' },
          { name: 'active', label: 'Show on website', type: 'boolean' },
        ],
        columns: [
          { key: 'question', label: 'Question', render: (r) => <p className="max-w-xl font-semibold text-gray-900">{r.question}</p> },
          { key: 'group', label: 'Group', render: (r) => <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold-deep">{r.group}</span> },
          { key: 'order', label: 'Order', className: 'hidden md:table-cell' },
          { key: 'active', label: 'Status', render: (r) => yes(r.active) },
        ],
      }}
    />
  );
}

export function TestimonialsManager() {
  return (
    <ResourceManager
      config={{
        resource: 'testimonials',
        title: 'Testimonials',
        singular: 'Testimonial',
        defaults: { rating: 5, active: true, order: 0 },
        fields: [
          { name: 'name', label: 'Client name', type: 'text' },
          { name: 'role', label: 'Role / visa type', type: 'text' },
          { name: 'country', label: 'Country', type: 'text' },
          { name: 'rating', label: 'Rating (1-5)', type: 'number' },
          { name: 'text', label: 'Review text', type: 'textarea' },
          { name: 'avatar', label: 'Photo (optional)', type: 'image' },
          { name: 'order', label: 'Sort order', type: 'number' },
          { name: 'active', label: 'Show on website', type: 'boolean' },
        ],
        columns: [
          { key: 'name', label: 'Client', render: (r) => <div><p className="font-semibold">{r.name}</p><p className="text-xs text-gray-400">{[r.role, r.country].filter(Boolean).join(' · ')}</p></div> },
          { key: 'rating', label: 'Rating', render: (r) => <span className="flex text-gold">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5" fill="currentColor" />)}</span> },
          { key: 'text', label: 'Review', className: 'hidden lg:table-cell', render: (r) => <p className="max-w-md truncate text-gray-500">{r.text}</p> },
          { key: 'active', label: 'Status', render: (r) => yes(r.active) },
        ],
      }}
    />
  );
}

export function PartnersManager() {
  return (
    <ResourceManager
      config={{
        resource: 'partners',
        title: 'Partner & authority logos',
        singular: 'Logo',
        defaults: { active: true, order: 0 },
        fields: [
          { name: 'name', label: 'Name', type: 'text' },
          { name: 'logo', label: 'Logo image', type: 'image' },
          { name: 'url', label: 'Link (optional)', type: 'text' },
          { name: 'order', label: 'Sort order', type: 'number' },
          { name: 'active', label: 'Show on website', type: 'boolean' },
        ],
        columns: [
          {
            key: 'name',
            label: 'Logo',
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-20 place-items-center rounded-lg bg-gray-50 ring-1 ring-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.logo ? <img src={r.logo} alt="" className="max-h-8 max-w-[70px] object-contain" /> : <span className="text-[0.6rem] text-gray-400">No logo</span>}
                </span>
                <span className="font-semibold">{r.name}</span>
              </div>
            ),
          },
          { key: 'order', label: 'Order' },
          { key: 'active', label: 'Status', render: (r) => yes(r.active) },
        ],
      }}
    />
  );
}

export function CustomersManager() {
  return (
    <ResourceManager
      config={{
        resource: 'users',
        title: 'Customers',
        subtitle: 'Clients who registered or applied online.',
        singular: 'Customer',
        exportType: 'users',
        defaults: { role: 'CUSTOMER', active: true },
        initialFilters: { role: 'CUSTOMER' },
        filters: [{ key: 'role', label: 'Roles', options: [{ value: 'CUSTOMER', label: 'Customers' }, { value: 'ADMIN', label: 'Admins' }, { value: 'EDITOR', label: 'Editors' }] }],
        transformBeforeEdit: (r) => ({ ...r, password: '' }),
        fields: [
          { name: 'name', label: 'Full name', type: 'text' },
          { name: 'email', label: 'Email', type: 'text' },
          { name: 'phone', label: 'Phone', type: 'text' },
          { name: 'nationality', label: 'Nationality', type: 'text' },
          { name: 'password', label: 'Password (leave empty to keep current)', type: 'text' },
          { name: 'active', label: 'Account active (can log in)', type: 'boolean' },
        ],
        columns: [
          { key: 'name', label: 'Name', render: (r) => <div><p className="font-semibold">{r.name}</p><p className="text-xs text-gray-400">{r.email}</p></div> },
          { key: 'phone', label: 'Phone', className: 'hidden md:table-cell' },
          { key: 'role', label: 'Role', render: (r) => <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold">{r.role}</span> },
          { key: 'apps', label: 'Applications', className: 'hidden md:table-cell', render: (r) => r._count?.applications ?? 0 },
          { key: 'createdAt', label: 'Joined', className: 'hidden lg:table-cell', render: (r) => formatDate(r.createdAt) },
          { key: 'active', label: 'Status', render: (r) => yes(r.active) },
        ],
      }}
    />
  );
}

export function UsersManager() {
  return (
    <ResourceManager
      config={{
        resource: 'users',
        title: 'Admin users & roles',
        subtitle: 'Administrators can do everything. Editors can manage content, leads and applications but not settings or users.',
        singular: 'User',
        defaults: { role: 'EDITOR', active: true },
        filters: [
          {
            key: 'role',
            label: 'Roles',
            options: [
              { value: 'ADMIN', label: 'Admin' },
              { value: 'EDITOR', label: 'Editor' },
              { value: 'CUSTOMER', label: 'Customer' },
            ],
          },
        ],
        transformBeforeEdit: (r) => ({ ...r, password: '' }),
        fields: [
          { name: 'name', label: 'Full name', type: 'text' },
          { name: 'email', label: 'Email (login)', type: 'text' },
          { name: 'phone', label: 'Phone', type: 'text' },
          {
            name: 'role',
            label: 'Role',
            type: 'select',
            options: [
              { value: 'ADMIN', label: 'Administrator (full access)' },
              { value: 'EDITOR', label: 'Editor (content & CRM)' },
              { value: 'CUSTOMER', label: 'Customer (client portal only)' },
            ],
          },
          { name: 'password', label: 'Password (min 8 characters; leave empty to keep current when editing)', type: 'text' },
          { name: 'active', label: 'Account active', type: 'boolean' },
        ],
        columns: [
          { key: 'name', label: 'Name', render: (r) => <div><p className="font-semibold">{r.name}</p><p className="text-xs text-gray-400">{r.email}</p></div> },
          {
            key: 'role',
            label: 'Role',
            render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.role === 'ADMIN' ? 'bg-ink text-gold' : r.role === 'EDITOR' ? 'bg-gold/20 text-gold-deep' : 'bg-gray-100 text-gray-600'}`}>{r.role}</span>,
          },
          { key: 'lastLoginAt', label: 'Last login', className: 'hidden md:table-cell', render: (r) => (r.lastLoginAt ? formatDateTime(r.lastLoginAt) : 'Never') },
          { key: 'active', label: 'Status', render: (r) => yes(r.active) },
        ],
      }}
    />
  );
}

export function SubscribersManager() {
  return (
    <ResourceManager
      config={{
        resource: 'subscribers',
        title: 'Newsletter subscribers',
        singular: 'Subscriber',
        exportType: 'subscribers',
        canEdit: false,
        fields: [{ name: 'email', label: 'Email', type: 'text' }],
        columns: [
          { key: 'email', label: 'Email', render: (r) => <span className="font-semibold">{r.email}</span> },
          { key: 'createdAt', label: 'Subscribed', render: (r) => formatDateTime(r.createdAt) },
        ],
      }}
    />
  );
}
