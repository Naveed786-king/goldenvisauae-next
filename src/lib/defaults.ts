// Default settings. Everything here is editable from Admin → Settings / Header / Footer.

export type NavLink = { label: string; href: string; description?: string; icon?: string; children?: NavLink[] };

export type SiteSettings = {
  name: string;
  tagline: string;
  logo: string;
  logoLight: string;
  favicon: string;
  phone: string;
  phoneDisplay: string;
  whatsapp: string;
  whatsappMessage: string;
  emailGeneral: string;
  emailVisa: string;
  address: string;
  poBox: string;
  mapUrl: string;
  mapEmbed: string;
  hours: string;
  hoursClosed: string;
  social: { facebook: string; instagram: string; youtube: string; twitter: string; linkedin: string; tiktok: string };
  colors: { gold: string; goldLight: string; ink: string; sand: string };
  showWhatsappButton: boolean;
  showMobileBar: boolean;
  showPreloader: boolean;
  headScripts: string;
  bodyScripts: string;
  seo: { titleTemplate: string; defaultTitle: string; description: string; keywords: string; ogImage: string; googleVerification?: string; bingVerification?: string };
};

export type MegaMenu = {
  enabled: boolean;
  attachTo: string; // the menu item (by its link) that opens the big panel, e.g. /services
  eyebrow: string;
  title: string;
  text: string;
  bullets: string; // one per line
  groups: { title: string; links: NavLink[] }[];
  calculatorLabel: string;
  calculatorHref: string;
  allLabel: string;
  allHref: string;
};

export type HeaderSettings = {
  topbar: { enabled: boolean; text: string; linkLabel: string; linkHref: string };
  menu: NavLink[];
  cta: { label: string; href: string };
  showLogin: boolean;
  mega: MegaMenu;
};

export type FooterSettings = {
  about: string;
  columns: { title: string; links: NavLink[] }[];
  ctaTitle: string;
  ctaHighlight: string;
  ctaButton: { label: string; href: string };
  newsletter: { enabled: boolean; title: string; text: string };
  copyright: string;
  disclaimer: string;
  bottomLinks: NavLink[];
};

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  notifyEmail: string; // one or more addresses (comma or new line separated)
  notifyOn: { leads: boolean; applications: boolean; messages: boolean; accounts: boolean; subscribers: boolean };
};

export const defaultSite: SiteSettings = {
  name: 'Golden Visa UAE',
  tagline: 'United Arab Emirates',
  logo: '',
  logoLight: '',
  favicon: '',
  phone: '+971566556645',
  phoneDisplay: "+971 56 655 6645",
  whatsapp: '971566556645',
  whatsappMessage: "Hello! I'm interested in the UAE Golden Visa. Please assist me.",
  emailGeneral: "info@brightlink.ae",
  emailVisa: "visa@brightlink.ae",
  address: 'Office M08-27, M1 Floor, Crystal Tower, Millennium Central Same Building, Al Asayel St, Business Bay, Dubai, U.A.E',
  poBox: 'PO Box: 554552',
  mapUrl: "https://maps.app.goo.gl/Wub4NZefiQ7LBMkd9",
  mapEmbed: 'https://www.google.com/maps?q=Crystal+Tower+Business+Bay+Dubai&output=embed',
  hours: "Mon \u2013 Sat, 9:00 \u2013 18:00",
  hoursClosed: 'Sunday closed',
  social: {
    facebook: 'https://www.facebook.com/brightlinkconsulting.uae/',
    instagram: 'https://www.instagram.com/brightlink.consulting/',
    youtube: 'https://www.youtube.com/@brightlinkconsulting',
    twitter: 'https://twitter.com/BRIGHTLINKCONS1',
    linkedin: 'https://www.linkedin.com/company/brightlink-management-consultancy/',
    tiktok: 'https://www.tiktok.com/@brightlink.consulting',
  },
  colors: { gold: '#C9A24A', goldLight: '#ECD9A3', ink: '#0B0B0C', sand: '#FAF8F3' },
  showWhatsappButton: true,
  showMobileBar: true,
  showPreloader: true,
  headScripts: '',
  bodyScripts: '',
  seo: {
    titleTemplate: '%s | Golden Visa UAE',
    defaultTitle: 'Golden Visa UAE | 10-Year Dubai Residency Consultants',
    description:
      'Secure 5 and 10-year UAE residency with a DET approved Golden Visa consultancy in Dubai. Free eligibility opinion, fixed fees, and a 24-hour fast track for property investors.',
    keywords: 'UAE Golden Visa, Dubai Golden Visa, 10-year residency UAE, property investor visa Dubai, Golden Visa cost, family visa UAE, Emirates ID',
    ogImage: '/images/hero-skyline.jpg',
    googleVerification: '',
    bingVerification: '',
  },
};

export const defaultHeader: HeaderSettings = {
  topbar: {
    enabled: true,
    text: 'Property Golden Visa issued within 24 hours on the VIP fast track',
    linkLabel: 'Check eligibility',
    linkHref: '/apply',
  },
  menu: [
    { label: 'Home', href: '/' },
    { label: 'Golden Visa', href: '/services/golden-visa' },
    { label: 'Services', href: '/services' },
    { label: 'Visa Check', href: '/check-visa-status' },
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'FAQs', href: '/faqs' },
    { label: 'Contact', href: '/contact' },
  ],
  cta: { label: 'Apply Now', href: '/apply' },
  showLogin: true,
  mega: {
    enabled: true,
    attachTo: '/services',
    eyebrow: 'Services',
    title: 'Every step, one firm',
    text: 'From eligibility opinion to Emirates ID collection — a single mandate, a named consultant, fixed fees.',
    bullets: 'DET approved consultancy, Dubai\nFixed, written fees\n24-hour VIP fast track',
    groups: [
      {
        "title": "Residency & investment",
        "links": [
          {
            "label": "UAE Golden Visa",
            "href": "/services/golden-visa",
            "icon": "crown"
          },
          {
            "label": "Golden Visa Cost",
            "href": "/services/golden-visa-cost",
            "icon": "calculator"
          },
          {
            "label": "Family & Dependant Visa",
            "href": "/services/family-visa",
            "icon": "users"
          },
          {
            "label": "Property Investor Visa",
            "href": "/services/property-investor-visa",
            "icon": "building"
          },
          {
            "label": "Property Revaluation",
            "href": "/services/property-revaluation",
            "icon": "trending"
          },
          {
            "label": "DLD Trustee Services",
            "href": "/services/dld-trustee-services",
            "icon": "key"
          }
        ]
      },
      {
        "title": "Business & processing",
        "links": [
          {
            "label": "Business Setup",
            "href": "/services/business-setup",
            "icon": "briefcase"
          },
          {
            "label": "PRO Services",
            "href": "/services/pro-services",
            "icon": "clipboard"
          },
          {
            "label": "Amer Services",
            "href": "/services/amer-services",
            "icon": "landmark"
          },
          {
            "label": "Medical & ID",
            "href": "/services/medical-emirates-id",
            "icon": "doctor"
          },
          {
            "label": "Emirates ID",
            "href": "/services/emirates-id",
            "icon": "id"
          },
          {
            "label": "ILOE Insurance",
            "href": "/services/iloe-insurance",
            "icon": "shield"
          },
          {
            "label": "Newborn Baby Visa",
            "href": "/services/newborn-visa",
            "icon": "baby"
          },
          {
            "label": "Maid & Nanny Visa",
            "href": "/services/maid-visa",
            "icon": "home"
          }
        ]
      },
      {
        "title": "Documents & legal",
        "links": [
          {
            "label": "Attestation",
            "href": "/services/document-attestation",
            "icon": "stamp"
          },
          {
            "label": "Legal Translation",
            "href": "/services/legal-translation",
            "icon": "languages"
          },
          {
            "label": "Power of Attorney",
            "href": "/services/power-of-attorney",
            "icon": "scale"
          },
          {
            "label": "Wills & Testament",
            "href": "/services/wills-testament",
            "icon": "scroll"
          }
        ]
      }
    ],
    calculatorLabel: 'Cost calculator',
    calculatorHref: '#calculator',
    allLabel: 'All services',
    allHref: '/services',
  },
};

export const defaultFooter: FooterSettings = {
  about: 'A DET approved consultancy based in Dubai, operated by Brightlink Management Consultancy and founded by UAE industry experts with decades of experience.',
  columns: [
    {
      title: 'Services',
      links: [
        {
          "label": "UAE Golden Visa",
          "href": "/services/golden-visa"
        },
        {
          "label": "Golden Visa Cost",
          "href": "/services/golden-visa-cost"
        },
        {
          "label": "Property Investor Visa",
          "href": "/services/property-investor-visa"
        },
        {
          "label": "Family & Dependant Visa",
          "href": "/services/family-visa"
        },
        {
          "label": "Business Setup",
          "href": "/services/business-setup"
        },
        {
          "label": "PRO Services",
          "href": "/services/pro-services"
        },
        {
          "label": "View all services",
          "href": "/services"
        }
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About us', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'FAQs', href: '/faqs' },
        { label: 'Apply now', href: '/apply' },
        { label: 'Insights', href: '/blog' },
        { label: 'Visa validity check', href: '/check-visa-status' },
        { label: 'Official sources', href: '/official-sources' },
        { label: 'Client login', href: '/login' },
      ],
    },
  ],
  ctaTitle: 'Find out if you qualify',
  ctaHighlight: 'in one conversation',
  ctaButton: { label: 'Apply Now', href: '/apply' },
  newsletter: { enabled: true, title: 'Newsletter', text: 'Policy changes, threshold updates and processing timelines — once a month, nothing else.' },
  copyright: '© {year} Golden Visa UAE Consultancy. All rights reserved.',
  disclaimer:
    'Golden Visa UAE is operated by Brightlink Management Consultancy LLC, a private consultancy. We are not a government authority and are not affiliated with any UAE government entity. Government references: ICP, GDRFA, Dubai Land Department, Ministry of Justice. Final approval, processing times and visa decisions rest solely with the competent UAE authorities.',
  bottomLinks: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Disclaimer', href: '/disclaimer' },
  ],
};

export const defaultSmtp: SmtpSettings = {
  host: '',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  from: '',
  notifyEmail: '',
  notifyOn: { leads: true, applications: true, messages: true, accounts: true, subscribers: true },
};

export const SERVICE_OPTIONS = [
  "UAE Golden Visa",
  "Golden Visa Cost",
  "Property Investor Visa",
  "Family & Dependant Visa",
  "Business Setup",
  "PRO Services",
  "Amer Services",
  "Property Revaluation",
  "Attestation",
  "Legal Translation",
  "Power of Attorney",
  "Wills & Testament",
  "DLD Trustee Services",
  "Medical & ID",
  "Emirates ID",
  "ILOE Insurance",
  "Newborn Baby Visa",
  "Maid & Nanny Visa",
  "Visa validity check",
  "Other"
];

export const APPLICATION_STATUSES: { value: string; label: string; progress: number; color: string }[] = [
  { value: 'submitted', label: 'Submitted', progress: 10, color: 'slate' },
  { value: 'under_review', label: 'Under Review', progress: 25, color: 'blue' },
  { value: 'documents_required', label: 'Documents Required', progress: 30, color: 'amber' },
  { value: 'processing', label: 'Processing', progress: 50, color: 'indigo' },
  { value: 'initial_approval', label: 'Initial Approval', progress: 65, color: 'violet' },
  { value: 'medical_biometrics', label: 'Medical & Biometrics', progress: 80, color: 'cyan' },
  { value: 'approved', label: 'Visa Approved', progress: 95, color: 'emerald' },
  { value: 'completed', label: 'Completed', progress: 100, color: 'green' },
  { value: 'rejected', label: 'Rejected', progress: 100, color: 'red' },
  { value: 'cancelled', label: 'Cancelled', progress: 0, color: 'zinc' },
];

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'closed'];

export type TranslationSettings = {
  provider: 'gemini' | 'google' | 'claude' | 'deepl' | 'off';
  apiKey: string; // Claude or DeepL key
  model: string; // Claude model
  geminiKey: string; // Google Gemini key (aistudio.google.com/apikey)
  geminiModel: string;
  autoTranslate: boolean;
  enabled: string[]; // language codes shown on the website
  showSwitcher: boolean;
};

export const defaultTranslation: TranslationSettings = {
  // Free Google engine works out of the box (no key) for the 8 languages without a built-in
  // pack; add a Gemini/Claude/DeepL key in Admin → Languages for higher quality.
  provider: (process.env.TRANSLATION_PROVIDER as TranslationSettings['provider']) || (process.env.GEMINI_API_KEY ? 'gemini' : 'google'),
  apiKey: '',
  model: 'claude-sonnet-5-5',
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  autoTranslate: true,
  enabled: ['en', 'ar', 'ru', 'tr', 'zh', 'fr', 'de', 'es', 'ro', 'hi'],
  showSwitcher: true,
};
