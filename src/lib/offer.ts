// "Limited time offer" pop-up (Admin → Offer pop-up). Shown once per page per visit after a short delay.
export type OfferPackage = { name: string; govt: string; fee: string; price: string; time: string; pickup: boolean };
export type OfferSettings = {
  enabled: boolean;
  delay: number; // seconds
  eyebrow: string;
  title: string;
  lead: string;
  govtLabel: string;
  ourLabel: string;
  ourLabelPlain: string;
  noPickup: string;
  totalLabel: string;
  packages: OfferPackage[];
  bullets: string; // one per line
  cta: { label: string; href: string };
  waLabel: string;
  waPrefix: string;
  note: string;
};

export const defaultOffer: OfferSettings = {
  enabled: true,
  delay: 8,
  eyebrow: 'Limited time offer',
  title: 'Dubai Golden Visa Packages (Through Property & Fixed Deposit)',
  lead: 'All-in prices including government fees — guaranteed approval within the stated timeline or money back.',
  govtLabel: 'Government Fee',
  ourLabel: 'Our fee (Pick-up & Drop-off)',
  ourLabelPlain: 'Our fee',
  noPickup: 'Pick-up & drop-off not included',
  totalLabel: 'Total',
  packages: [
    { name: 'VIP Fast Track Package (Approval in 24 Hours)', govt: '9,978', fee: '5,250', price: '15,228', time: 'Within 24 hours', pickup: true },
    { name: 'Urgent Package (Approval in 2-3 Days)', govt: '9,978', fee: '3,150', price: '13,128', time: '2-3 days', pickup: true },
    { name: 'Normal Package (Approval in 3-7 Days)', govt: '9,978', fee: '1,575', price: '11,553', time: '3-7 days', pickup: false },
  ],
  bullets: 'Guaranteed approval within the timeline\nMoney-back guarantee\nDedicated consultant through to Emirates ID',
  cta: { label: 'Get it today', href: '/apply' },
  waLabel: 'Chat on WhatsApp',
  waPrefix: "I'm interested in the",
  note: 'Limited time offer — terms apply.',
};

export const OFFER_TEXT_KEYS = ['eyebrow', 'title', 'lead', 'govtLabel', 'ourLabel', 'ourLabelPlain', 'noPickup', 'totalLabel', 'bullets', 'waLabel', 'waPrefix', 'note'] as const;
