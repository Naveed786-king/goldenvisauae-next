// Settings of the client system: payments, WhatsApp, client emails & PDFs, application steps and the
// client dashboard address. All edited in the admin; saved in the Setting table (one JSON per key).

export type PayProvider = 'none' | 'ziina' | 'stripe' | 'totalpay' | 'ngenius' | 'telr';

export type PaymentSettings = {
  provider: PayProvider;
  test: boolean;
  currency: string;
  stripeSecret: string;
  stripeWebhook: string;
  ziinaToken: string;
  ngeniusKey: string;
  ngeniusOutlet: string;
  telrStore: string;
  telrKey: string;
  totalpayKey: string;
  totalpayPass: string;
  totalpayHost: string;
  /** the client can pay the whole quote straight away ("Pay & confirm") */
  payOnQuote: boolean;
  /** move the file to "Payment received" when everything is paid */
  autoStage: boolean;
  /** send the receipt PDF on WhatsApp */
  receiptWa: boolean;
  /** card fee the client sees before paying (UAE card / international card) */
  feeOn: boolean;
  feeLocalPct: number;
  feeIntlPct: number;
  feeFixed: number;
  /** bank transfer as a second way to pay (the client uploads the transfer slip) */
  bankOn: boolean;
  bankName: string;
  bankHolder: string;
  bankIban: string;
  bankAccount: string;
  bankSwift: string;
  bankNote: string;
  /** text above the payment buttons */
  payText: string;
};

export const defaultPayments: PaymentSettings = {
  provider: 'none',
  test: true,
  currency: 'AED',
  stripeSecret: '',
  stripeWebhook: '',
  ziinaToken: '',
  ngeniusKey: '',
  ngeniusOutlet: '',
  telrStore: '',
  telrKey: '',
  totalpayKey: '',
  totalpayPass: '',
  totalpayHost: 'https://checkout.totalpay.global',
  payOnQuote: true,
  autoStage: true,
  receiptWa: true,
  feeOn: false,
  feeLocalPct: 2.99,
  feeIntlPct: 3.99,
  feeFixed: 1,
  bankOn: false,
  bankName: '',
  bankHolder: '',
  bankIban: '',
  bankAccount: '',
  bankSwift: '',
  bankNote: '',
  payText: 'Pay securely online by card. You can also pay by bank transfer to our company account and upload the transfer slip.',
};

export type ClientEvent = 'welcome' | 'status' | 'quote' | 'confirmed' | 'payment' | 'paid' | 'message' | 'document' | 'decision';
export type TeamEvent = 'teamApplication' | 'teamPayment' | 'teamMessage' | 'teamSlip';
export type NotifyEvent = ClientEvent | TeamEvent;

export type WhatsAppSettings = {
  /** off: only "chat on WhatsApp" buttons; cloud: automatic messages through the WhatsApp Cloud API */
  mode: 'off' | 'cloud';
  phoneNumberId: string;
  businessId: string;
  accessToken: string;
  /** App secret of the Meta app: checks that webhook calls really come from Meta */
  appSecret: string;
  verifyToken: string;
  /** language code of the approved templates, e.g. en or en_US */
  templateLang: string;
  /** approved template name per message (used outside the 24-hour window) */
  templates: Partial<Record<NotifyEvent, string>>;
  /** automatic message on/off per event */
  autos: Record<NotifyEvent, boolean>;
  /** company numbers that get the team alerts (one per line) */
  teamNumbers: string;
  /** own WhatsApp text per message (empty: the text of Emails & PDFs > Emails is used) */
  waTexts?: Partial<Record<NotifyEvent, string>>;
  /** the team numbers also get every update sent to a client */
  copyTeam?: boolean;
  /** Google review request when a file reaches its last step */
  reviewLink?: string;
  reviewAsk?: boolean;
  reviewText?: string;
};

export const NOTIFY_EVENTS: { key: NotifyEvent; label: string; to: 'client' | 'team'; vars: string[] }[] = [
  { key: 'welcome', label: 'Application received', to: 'client', vars: ['name', 'ref', 'service', 'link'] },
  { key: 'status', label: 'Status update (new step)', to: 'client', vars: ['name', 'ref', 'status', 'next', 'link'] },
  { key: 'quote', label: 'Quote ready', to: 'client', vars: ['name', 'ref', 'service', 'total', 'link'] },
  { key: 'confirmed', label: 'Order confirmed (quote accepted)', to: 'client', vars: ['name', 'ref', 'service', 'total', 'link'] },
  { key: 'payment', label: 'Payment request', to: 'client', vars: ['name', 'ref', 'item', 'amount', 'link'] },
  { key: 'paid', label: 'Payment received', to: 'client', vars: ['name', 'ref', 'item', 'amount', 'receipt', 'link'] },
  { key: 'message', label: 'New message from your advisor', to: 'client', vars: ['name', 'ref', 'text', 'link'] },
  { key: 'document', label: 'New document shared', to: 'client', vars: ['name', 'ref', 'document', 'link'] },
  { key: 'decision', label: 'Authority decision', to: 'client', vars: ['name', 'ref', 'status', 'reason', 'link'] },
  { key: 'teamApplication', label: 'New application (to your team)', to: 'team', vars: ['name', 'phone', 'email', 'service', 'ref', 'link'] },
  { key: 'teamPayment', label: 'Payment received (to your team)', to: 'team', vars: ['name', 'ref', 'item', 'amount', 'link'] },
  { key: 'teamMessage', label: 'Client sent a message (to your team)', to: 'team', vars: ['name', 'ref', 'text', 'link'] },
  { key: 'teamSlip', label: 'Bank transfer slip uploaded (to your team)', to: 'team', vars: ['name', 'ref', 'item', 'amount', 'link'] },
];

const allOn = Object.fromEntries(NOTIFY_EVENTS.map((e) => [e.key, true])) as Record<NotifyEvent, boolean>;

export const defaultWhatsApp: WhatsAppSettings = {
  mode: 'off',
  phoneNumberId: '',
  businessId: '',
  accessToken: '',
  appSecret: '',
  verifyToken: '',
  templateLang: 'en',
  templates: {},
  autos: allOn,
  teamNumbers: '',
};

export type MailTemplate = { on: boolean; subject: string; body: string };

/** One text per event: used for the email and (outside templates) for WhatsApp. "Label: value" lines show as a table. */
export const defaultClientMail: { events: Record<NotifyEvent, MailTemplate>; signOff: string } = {
  signOff: 'Kind regards,\nGolden Visa UAE',
  events: {
    welcome: { on: true, subject: 'We received your application {ref}', body: 'Hello {name},\n\nThank you for choosing us. We have received your application and your advisor will review it shortly.\n\nReference: {ref}\nService: {service}\n\nFollow your application, upload documents and message your advisor here:\n{link}' },
    status: { on: true, subject: 'Update on your application {ref}: {status}', body: 'Hello {name},\n\nYour application has moved to a new step.\n\nReference: {ref}\nCurrent step: {status}\n\n{next}\n\nSee the details in your dashboard:\n{link}' },
    quote: { on: true, subject: 'Your quotation for {ref} is ready', body: 'Hello {name},\n\nYour quotation is ready. Please review the government fees, our service fee and the next steps.\n\nReference: {ref}\nService: {service}\nTotal: {total}\n\nView, accept and pay your quotation here:\n{link}' },
    confirmed: { on: true, subject: 'Order confirmed: {ref}', body: 'Hello {name},\n\nThank you for confirming your order. We will now prepare your application.\n\nReference: {ref}\nService: {service}\nTotal: {total}\n\nTrack every step here:\n{link}' },
    payment: { on: true, subject: 'Payment request for {ref}', body: 'Hello {name},\n\nA payment is due for your application.\n\nReference: {ref}\nItem: {item}\nAmount: {amount}\n\nPay securely here:\n{link}' },
    paid: { on: true, subject: 'Payment received for {ref}', body: 'Hello {name},\n\nThank you, we have received your payment.\n\nReference: {ref}\nItem: {item}\nAmount: {amount}\nReceipt: {receipt}\n\nYour receipt is in your dashboard:\n{link}' },
    message: { on: true, subject: 'New message about your application {ref}', body: 'Hello {name},\n\nYour advisor sent you a message:\n\n{text}\n\nReply here:\n{link}' },
    document: { on: true, subject: 'New document for your application {ref}', body: 'Hello {name},\n\nWe shared a new document with you.\n\nReference: {ref}\nDocument: {document}\n\nDownload it here:\n{link}' },
    decision: { on: true, subject: 'Decision on your application {ref}', body: 'Hello {name},\n\nThe authority has made a decision on your application.\n\nReference: {ref}\nDecision: {status}\n{reason}\n\nSee the details and next steps here:\n{link}' },
    teamApplication: { on: true, subject: 'New application {ref}: {name}', body: 'New application received.\n\nName: {name}\nPhone: {phone}\nEmail: {email}\nService: {service}\nReference: {ref}\n\nOpen in admin:\n{link}' },
    teamPayment: { on: true, subject: 'Payment received: {ref} ({amount})', body: 'A client paid online.\n\nName: {name}\nReference: {ref}\nItem: {item}\nAmount: {amount}\n\nOpen in admin:\n{link}' },
    teamMessage: { on: true, subject: 'Client message: {ref}', body: '{name} wrote about {ref}:\n\n{text}\n\nReply in admin:\n{link}' },
    teamSlip: { on: true, subject: 'Bank transfer slip uploaded: {ref}', body: '{name} uploaded a bank transfer slip.\n\nReference: {ref}\nItem: {item}\nAmount: {amount}\n\nCheck it and mark the payment as paid:\n{link}' },
  },
};
export type ClientMailSettings = typeof defaultClientMail;

export type PdfSettings = {
  accent: string;
  quoteTitle: string;
  receiptTitle: string;
  intro: string;
  notes: string;
  footer: string;
  signName: string;
  signTitle: string;
};
export const defaultPdf: PdfSettings = {
  accent: '#b8901f',
  quoteTitle: 'UAE Golden Visa quotation',
  receiptTitle: 'Payment receipt',
  intro: '',
  notes: 'Government fees are set by the UAE authorities and can change. We confirm the final amount in writing before you pay. Visa approval is decided by the authorities only.',
  footer: '',
  signName: '',
  signTitle: '',
};

export type StepDef = { id: string; name: string; group: string; next: string; notify?: boolean };
export type StepState = 'done' | 'progress' | 'pending' | 'hold' | 'action' | 'na';
export const STEP_STATE_LABEL: Record<StepState, string> = {
  done: 'Completed',
  progress: 'In progress',
  pending: 'Pending',
  hold: 'On hold',
  action: 'Action required',
  na: 'Not applicable',
};

const G1 = 'Enquiry, quotation & payment';
const G2 = 'Immigration & residency';
const G3 = 'Emirates ID & completion';
export const GOLDEN_STEPS: StepDef[] = [
  { id: 'enquiry', group: G1, name: 'Application received', next: 'Thank you. Our team has received your application and will contact you to review your eligibility and the documents needed.' },
  { id: 'elig-check', group: G1, name: 'Eligibility check', next: 'Our team is reviewing your documents and eligibility against the current UAE Golden Visa requirements.' },
  { id: 'elig-ok', group: G1, name: 'Eligibility confirmed', next: 'Your initial eligibility review is complete. We are preparing your quotation and next steps. Final approval is decided by the authorities.' },
  { id: 'quote-sent', group: G1, name: 'Quote sent', next: 'Your quotation is ready in your dashboard: government fees, our service fee and the estimated timeline.' },
  { id: 'quote-ok', group: G1, name: 'Quote accepted', next: 'Thank you for accepting the quotation. We will now arrange payment and prepare your application.' },
  { id: 'pay-wait', group: G1, name: 'Waiting for payment', next: 'Your application is waiting for payment. Please use the payment button in your dashboard so we can continue.' },
  { id: 'paid', group: G1, name: 'Payment received', next: 'Your payment has been received. Our team will now complete your application and submit it to the authority.' },
  { id: 'submitted', group: G2, name: 'Application submitted', next: 'Your application has been submitted to the immigration authority (ICP or GDRFA). We are following it and will update you as soon as there is news.' },
  { id: 'entry-permit', group: G2, name: 'Entry permit / pre-approval', next: 'Your entry permit or pre-approval has been issued. We will coordinate the next step: entry to the UAE or change of status.' },
  { id: 'cos', group: G2, name: 'Change of status', next: 'Your immigration status is being changed for the residency application.' },
  { id: 'medical', group: G2, name: 'Medical fitness test', next: 'The medical fitness test is the next step. We will book the appointment and send you the instructions.' },
  { id: 'insurance', group: G2, name: 'Health insurance', next: 'We are arranging the required health insurance for your residency.' },
  { id: 'eid-app', group: G2, name: 'Emirates ID application', next: 'Your Emirates ID application is being prepared and submitted.' },
  { id: 'biometrics', group: G2, name: 'Biometrics', next: 'Your Emirates ID biometrics appointment is the next step. Please attend with your passport at the booked time.' },
  { id: 'approved', group: G2, name: 'Residence approved', next: 'Congratulations! Your Golden Visa residency has been approved. We are now following the Emirates ID printing and delivery.' },
  { id: 'eid-printed', group: G3, name: 'Emirates ID printed', next: 'Your Emirates ID has been printed and is waiting for delivery.' },
  { id: 'eid-delivered', group: G3, name: 'Emirates ID delivered', next: 'Your Emirates ID has been delivered and your Golden Visa is complete. Thank you for choosing us.' },
];

const S1 = 'Enquiry, quotation & payment';
const S2 = 'Processing';
const S3 = 'Completion';
export const OTHER_STEPS: StepDef[] = [
  { id: 'enquiry', group: S1, name: 'Application received', next: 'Thank you. Our team has received your request and will contact you about the documents needed.' },
  { id: 'docs-check', group: S1, name: 'Documents check', next: 'We are checking your documents and will tell you if anything is missing.' },
  { id: 'quote-sent', group: S1, name: 'Quote sent', next: 'Your quotation is ready in your dashboard.' },
  { id: 'quote-ok', group: S1, name: 'Quote accepted', next: 'Thank you for accepting the quotation. We will now arrange payment.' },
  { id: 'pay-wait', group: S1, name: 'Waiting for payment', next: 'Your request is waiting for payment. Please use the payment button in your dashboard.' },
  { id: 'paid', group: S1, name: 'Payment received', next: 'Your payment has been received. We will now prepare and submit your application.' },
  { id: 'submitted', group: S2, name: 'Submitted to the authority', next: 'Your application has been submitted. We will update you as soon as there is news.' },
  { id: 'in-process', group: S2, name: 'In process', next: 'Your application is being processed by the authority.' },
  { id: 'approved', group: S3, name: 'Approved', next: 'Your application has been approved.' },
  { id: 'completed', group: S3, name: 'Completed', next: 'Your service is complete. Thank you for choosing us.' },
];

/** golden: Golden Visa steps; other: the standard list for every other service; groups: own lists per service group */
export type StepSettings = { golden: StepDef[]; other: StepDef[]; groups?: Record<string, StepDef[]> };

/** Service groups that can have their own step list (Admin > Application steps), as on the Abu Dhabi site */
export const STEP_SERVICES = ['Golden Visa', 'Family & residency', 'Visas', 'Employment', 'Property & documents', 'Visa services', 'Other services'] as const;

/** Which step list a service follows, from its name. */
export function stepGroupFor(service?: string | null): string {
  const t = String(service || '').toLowerCase();
  if (!t || /golden/.test(t)) return 'Golden Visa';
  if (/family|dependant|dependent|spouse|wife|husband|child|newborn|parent|residen|retire/.test(t)) return 'Family & residency';
  if (/employ|work permit|labour|labor|job|maid|nanny|domestic/.test(t)) return 'Employment';
  if (/emirates id|medical|renew|cancel|status change|change of status|typing|stamp/.test(t)) return 'Visa services';
  if (/property|title deed|attest|poa|power of attorney|legal|document|translation|notar/.test(t)) return 'Property & documents';
  if (/visa|visit|tourist|investor|freelance|partner/.test(t)) return 'Visas';
  return 'Other services';
}
export const defaultSteps: StepSettings = { golden: GOLDEN_STEPS, other: OTHER_STEPS };

export type PortalSettings = {
  /** address of the client dashboard, e.g. https://app.goldenvisauae.ai — empty: the main site's /account */
  url: string;
  /** advisor shown to clients when a file has none */
  advisorName: string;
  advisorPhone: string;
};
export const defaultPortal: PortalSettings = { url: '', advisorName: '', advisorPhone: '' };

/** Secret fields per setting: shown masked in the admin and kept when the mask is saved back */
export const SECRET_FIELDS: Record<string, string[]> = {
  payments: ['stripeSecret', 'stripeWebhook', 'ziinaToken', 'ngeniusKey', 'telrKey', 'totalpayPass'],
  whatsapp: ['accessToken', 'appSecret'],
};
export const MASK = '••••••••';
