// Customer dashboard and login text in all 20 website languages.
// English is the source; other languages are in portal-i18n-langs.ts. Native-speaker review is recommended.
import { OTHER } from './portal-i18n-langs';
import { BRAND_NAME, DEFAULT_BRAND, brandText } from '@/adgv/lib/brand';

export const EN = {
  signIn: 'Sign in', backToSite: 'Back to website', welcomeBack: 'Welcome back', enterDetails: 'Enter your email and password to continue.',
  email: 'Email', phone: 'WhatsApp number', password: 'Password', forgot: 'Forgot password?',
  newHere: 'New here?', createAccount: 'Create an account', haveAccount: 'Already have an account?', name: 'Full name', register: 'Create my account',
  orRef: 'Have a reference number?', reference: 'Reference', openFile: 'Open my file', needHelp: 'Need help? Chat on WhatsApp',
  leftEyebrow: 'Welcome to Abu Dhabi Golden Visa', leftTitle: 'Sign in to continue.', leftText: 'One place for your residency: quotes, documents, payments and every status update, in your language.',
  tick1: 'Real-time progress and dates', tick2: 'Secure documents and payments', tick3: 'Updates on WhatsApp',
  resetTitle: 'Reset your password', resetText: 'Enter your email. We send you a link to set a new password.', sendCode: 'Send link', code: '6-digit code', newPassword: 'New password', setPassword: 'Set new password', backToLogin: 'Back to sign in',
  myFiles: 'My applications', newRequest: 'Request a new service', newApp: 'New application', chooseService: 'Choose a service', details: 'Anything we should know?', sendRequest: 'Send request',
  requestSent: 'Request sent. An advisor will contact you on WhatsApp.', myRequests: 'My requests', noFiles: 'No applications yet. Request a service to get started.',
  signOut: 'Sign out', hello: 'Hello', step: 'Step', of: 'of', next: 'Next', expected: 'expected',
  status: 'Status', quote: 'Quote', payments: 'Payments', documents: 'Documents', messages: 'Messages', progress: 'Progress',
  yourQuote: 'Your quote', quotePreparing: 'Your advisor is preparing your written quote.', total: 'Total', serviceFee: 'Service fee', vat: 'VAT 5% on service fee', insurance: 'Health insurance',
  feesNote: 'Government fees are paid in AED and can change; we confirm any change before you pay.', accept: 'Accept quote', accepted: 'Accepted', downloadQuote: 'Download quote (PDF)',
  noPayments: 'No payments yet.', payNow: 'Pay now', getPayLink: 'Get payment link', requested: 'requested', paid: 'paid', receipt: 'Receipt',
  pleaseUpload: 'Please upload:', whichDoc: 'Which document?', other: 'Other', fileHint: 'File (PDF or photo, up to 15 MB)', upload: 'Upload', fromAdvisor: 'From your advisor', byYou: 'Uploaded by you', download: 'Download',
  advisorPosts: 'Your advisor will post updates here.', writeAdvisor: 'Write to your advisor', send: 'Send', you: 'You', yourAdvisor: 'Your advisor',
  yourDetails: 'Your details', route: 'Route', applyingFrom: 'Applying from', inside: 'Inside the UAE', outside: 'Outside the UAE', people: 'People in this file',
  issued: 'your residency is issued.', whereStand: 'here is where things stand.', yourFile: 'Your application',
  profile: 'My profile', language: 'Language', save: 'Save', saved: 'Saved.', currentPassword: 'Current password',
  wrongLogin: 'Email or password is not correct.', exists: 'An account with this email already exists. Please sign in.', weak: 'Use at least 8 characters.', invalid: 'Please check the details.',
  codeSent: 'If the account exists, we sent a link to set a new password to its email.', badCode: 'The code is not correct or has expired.', passwordChanged: 'Password changed. Please sign in.', tooMany: 'Too many attempts. Please try again later.',
  open: 'Open', received: 'Received', inProgress: 'In progress', back: 'Back',
  orderLabel: 'Application', stPreparing: 'Preparing quote', stQuotation: 'Quotation', stConfirmed: 'Confirmed', stCompleted: 'Completed',
  totalAmount: 'Total amount', amountDue: 'Amount due', paidSoFar: 'Paid', downloadPdf: 'Download PDF', requestAnother: 'Request another service',
  readyToProceed: 'Ready to proceed?', payIntro: 'Pay securely by card to confirm. Your receipt arrives on WhatsApp straight away.', payConfirm: 'Pay & confirm',
  payCancelled: 'Payment cancelled. No money was taken.', payError: 'We could not open the payment page. Please try again or contact your advisor.',
  orderDetails: 'Order details', orderNo: 'Order #', orderDate: 'Order date', customer: 'Customer', validUntil: 'Valid until', items: 'Order items',
  description: 'Description', amount: 'Amount', subtotal: 'Subtotal', terms: 'Terms & conditions',
  termsText: 'Government fees are passed on at cost and can change; we confirm any change before you pay. Our service fee covers advice, document checks, filing and follow-up. Approval and timelines are decided by the UAE authorities. Refunds of the service fee follow our refund policy.',
  yourContact: 'Your contact', quickActions: 'Quick actions', allOrders: 'All orders', statement: 'Account statement', servicesInOrder: 'Services in this order',
  trackProgress: 'Track every step of your file, live.', finalFiles: 'Final documents will be available here', unlockAfterPay: 'Pay your invoice to unlock the final documents for this file.',
  qty: 'Qty', unitPrice: 'Unit price', payWhole: 'Pay the full amount to confirm your order. Secure card payment.',
  bankTitle: 'Pay by bank transfer', bankIntro: 'Transfer the amount to our company account, then upload the transfer slip here. We confirm it and send your receipt.',
  bankName: 'Bank', accountName: 'Account name', iban: 'IBAN', accountNo: 'Account number', swift: 'SWIFT / BIC', uploadSlip: 'Upload transfer slip', amountToPay: 'Amount to pay',
  gTrack: 'Track', gMoney: 'Money', gRequests: 'Requests', home: 'Home', orders: 'Orders', quotations: 'Quotations', invoices: 'Invoices & receipts', calendar: 'Calendar', whatsappUs: 'WhatsApp us', menu: 'Menu',
  goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening', completed: 'Completed', openPayments: 'Open payments', docsShared: 'Documents for you',
  liveFiles: 'Live files', allFiles: 'All files', recentUpdates: 'Recent updates', nothingYet: 'Nothing here yet.', paidWithUs: 'Paid with us', allPaid: 'All paid, thank you', toPayNow: 'To pay now',
  everything: 'Everything you can do', searchOrders: 'Search file number or service', search: 'Search', noOrders: 'No orders yet. Your files will appear here.', noQuotes: 'There are no quotations waiting for you.',
  allStatus: 'All', due: 'Due', bookCall: 'Book a call', requestIntro: 'Pick a service and send your request. We reply with a written quote, usually within the same working day.',
  request: 'Request', today: 'Today', calendarIntro: 'Progress dates, payments and quote deadlines.', from: 'from',
  dOrders: 'Follow, view or pay your files.', dQuotes: 'Quotes waiting for you.', dInvoices: 'Payments, receipts and PDFs.', dStatement: 'All charges and payments, print or save as PDF.',
  dRequest: 'Golden Visa, family, valuation and more.', dRequests: 'Your service requests and replies.', dCalendar: 'Dates and deadlines this month.', dProfile: 'Your details, language and password.',
  evStage: 'Progress', evPaid: 'Payment received', evDue: 'Payment requested', evQuote: 'Quote sent', evMsg: 'Message from your advisor', evDoc: 'New document',
  live: 'Live', updatedAt: 'updated', communication: 'Communication', balance: 'Balance', date: 'Date', print: 'Print / Save as PDF', statementIntro: 'All quotes, payments and receipts across your files.',
  dashTitle: 'Open your full dashboard', dashHave: 'You already have an account. Sign in to see all your files, payments and messages in one place.', dashNew: 'Create your free account with the same email to see all your files, payments and messages in one place.',
  stages: ['Enquiry received', 'Eligibility confirmed', 'Quote accepted and paid', 'Documents and attestation', 'Nomination or valuation certificate', 'Application submitted', 'Entry permit or change of status', 'Medical and biometrics', 'Emirates ID and residence issued'],
};

export type Dict = typeof EN;

export const PORTAL_LANGS: { code: string; native: string; dir: 'ltr' | 'rtl'; html: string }[] = [
  { code: 'en', native: 'English', dir: 'ltr', html: 'en' }, { code: 'ar', native: 'العربية', dir: 'rtl', html: 'ar' },
  { code: 'ru', native: 'Русский', dir: 'ltr', html: 'ru' }, { code: 'tr', native: 'Türkçe', dir: 'ltr', html: 'tr' },
  { code: 'zh', native: '中文', dir: 'ltr', html: 'zh' }, { code: 'fr', native: 'Français', dir: 'ltr', html: 'fr' },
  { code: 'de', native: 'Deutsch', dir: 'ltr', html: 'de' }, { code: 'it', native: 'Italiano', dir: 'ltr', html: 'it' },
  { code: 'es', native: 'Español', dir: 'ltr', html: 'es' }, { code: 'ro', native: 'Română', dir: 'ltr', html: 'ro' },
  { code: 'pt', native: 'Português', dir: 'ltr', html: 'pt' }, { code: 'at', native: 'Deutsch (Österreich)', dir: 'ltr', html: 'de-AT' },
  { code: 'pl', native: 'Polski', dir: 'ltr', html: 'pl' }, { code: 'hu', native: 'Magyar', dir: 'ltr', html: 'hu' },
  { code: 'hr', native: 'Hrvatski', dir: 'ltr', html: 'hr' }, { code: 'sk', native: 'Slovenčina', dir: 'ltr', html: 'sk' },
  { code: 'cs', native: 'Čeština', dir: 'ltr', html: 'cs' }, { code: 'hi', native: 'हिन्दी', dir: 'ltr', html: 'hi' },
  { code: 'id', native: 'Bahasa Indonesia', dir: 'ltr', html: 'id' }, { code: 'ur', native: 'اردو', dir: 'rtl', html: 'ur' },
];

export function dict(code?: string | null): Dict {
  const c = code === 'at' ? 'de' : code || 'en';
  const o = OTHER[c];
  const d = o ? { ...EN, ...o, stages: o.stages ?? EN.stages } : EN;
  return BRAND_NAME === DEFAULT_BRAND ? d : { ...d, leftEyebrow: brandText(d.leftEyebrow) };
}
export function langInfo(code?: string | null) {
  return PORTAL_LANGS.find((l) => l.code === code) ?? PORTAL_LANGS[0];
}
