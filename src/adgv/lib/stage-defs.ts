// Application steps: the list is edited in Admin > Application steps (add, remove, rename, reorder,
// change the message the client sees). These are the defaults.
export type StageDef = { id: string; name: string; group: string; next: string; /** false: changing to this step does not message the client */ notify?: boolean };
export type StageState = 'done' | 'progress' | 'pending' | 'hold' | 'action' | 'na';

export const STATE_LABEL: Record<StageState, string> = {
  done: 'Completed', progress: 'In progress', pending: 'Pending', hold: 'On hold', action: 'Action required', na: 'Not applicable',
};

const G1 = 'Enquiry, quotation & payment', G2 = 'Immigration & residency processing', G3 = 'Emirates ID & completion';
export const STAGES0: StageDef[] = [
  { id: 'enquiry', group: G1, name: 'Enquiry received', next: 'Thank you for your enquiry. Our team has received your request and will contact you to review your Golden Visa eligibility and required documents.' },
  { id: 'elig-check', group: G1, name: 'Eligibility check', next: 'Our team is reviewing your documents, investment details and eligibility against the applicable Golden Visa requirements.' },
  { id: 'elig-ok', group: G1, name: 'Eligibility confirmed', next: 'Your initial eligibility assessment has been completed successfully. Our team will now prepare a detailed quotation and explain the next steps. Final approval remains subject to immigration.' },
  { id: 'quote-sent', group: G1, name: 'Quote sent', next: 'Your Golden Visa quotation has been prepared and shared. Please review the package details, government fees, service charges and estimated processing timeline.' },
  { id: 'quote-ok', group: G1, name: 'Quote accepted', next: 'Thank you for accepting our quotation. We will now arrange payment and prepare your application for submission.' },
  { id: 'pay-wait', group: G1, name: 'Waiting for payment', next: 'Your application is awaiting payment confirmation. Kindly complete the payment using the provided payment instructions so we can proceed.' },
  { id: 'paid', group: G1, name: 'Payment received', next: 'Your payment has been received and recorded. Our processing team will now complete the application preparation and arrange submission to the relevant authority.' },
  { id: 'submitted', group: G2, name: 'Application submitted', next: 'Your Golden Visa application has been submitted to the relevant Abu Dhabi immigration authority. We are monitoring the application and will update you when a decision or additional request is received.' },
  { id: 'entry-permit', group: G2, name: 'Entry permit (pre-approval)', next: 'Your entry permit or initial immigration approval has been issued. Our team will now coordinate the next applicable step, including entry into the UAE or change of status.' },
  { id: 'cos', group: G2, name: 'Change of status', next: 'Your immigration status is being updated to the appropriate residency application status. Once completed, we will coordinate the remaining residency procedures.' },
  { id: 'medical', group: G2, name: 'Health screening (medical test)', next: 'Your medical fitness examination is the next required step. Our team will coordinate the appointment and provide the necessary instructions. We will proceed once the medical results are available.' },
  { id: 'insurance', group: G2, name: 'Health insurance', next: 'We are coordinating the required health insurance coverage and verification for your Golden Visa application. Please provide any additional information requested by the insurer.' },
  { id: 'eid-app', group: G2, name: 'Emirates ID application', next: 'Your Emirates ID application is being prepared or submitted. We will share the registration details and coordinate biometrics if required.' },
  { id: 'biometrics', group: G2, name: 'Emirates ID biometrics', next: 'Your Emirates ID biometrics appointment is the next step, where applicable. Please attend at the scheduled time with the required identification documents.' },
  { id: 'approved', group: G2, name: 'Residence approved', next: 'Congratulations! Your Golden Residency application has been approved. We will now monitor the Emirates ID production and delivery process.' },
  { id: 'eid-printed', group: G3, name: 'Emirates ID printed', next: 'Your Emirates ID card has been printed and is awaiting dispatch or courier delivery. Our team will share the delivery arrangements once available.' },
  { id: 'eid-delivered', group: G3, name: 'Emirates ID delivered', next: 'Congratulations! Your Emirates ID has been successfully delivered, and your Golden Visa application is now complete. Thank you for choosing us.' },
];

/** Old 9-step list (position) -> new step id, used once to move existing files over. */
export const LEGACY_IDS = ['enquiry', 'elig-ok', 'paid', 'paid', 'paid', 'submitted', 'entry-permit', 'medical', 'approved'];

/** State of one step in a file: a hand-set state wins. Otherwise the chosen step and all before it are
 *  Completed and the next step is In progress (choosing "Payment received" ticks it and moves the file on). */
export function stageState(i: number, cur: number, id: string, overrides?: Record<string, StageState>, total = Infinity): StageState {
  const o = overrides?.[id];
  if (o) return o;
  if (i <= cur) return 'done';
  return i === cur + 1 && i < total ? 'progress' : 'pending';
}

/* ---------- Separate step lists per service group ----------
 * "Golden Visa" uses the 17 steps above. Every other service group starts with its own list below;
 * all lists are edited in Admin > Application steps (choose the service at the top). */
export const DEFAULT_SERVICE = 'Golden Visa';
export const STEP_SERVICES = ['Golden Visa', 'Family & residency', 'Visas', 'Employment', 'Property & documents', 'Visa services', 'Other services'] as const;

const S1 = 'Enquiry, quotation & payment', S2 = 'Processing', S3 = 'Completion';
const start = (what: string): StageDef[] => [
  { id: 'enquiry', group: S1, name: 'Enquiry received', next: `Thank you for your enquiry. Our team has received your ${what} request and will contact you to review the required documents.` },
  { id: 'docs-check', group: S1, name: 'Documents check', next: 'Our team is checking your documents. We will tell you if anything is missing or needs to be corrected.' },
  { id: 'quote-sent', group: S1, name: 'Quote sent', next: 'Your quotation is ready. Please review the government fees, our service charge and the estimated timeline in your dashboard.' },
  { id: 'quote-ok', group: S1, name: 'Quote accepted', next: 'Thank you for accepting our quotation. We will now arrange payment and prepare your application.' },
  { id: 'pay-wait', group: S1, name: 'Waiting for payment', next: 'Your application is waiting for payment. Please use the payment link we sent so we can continue.' },
  { id: 'paid', group: S1, name: 'Payment received', next: 'Your payment has been received and recorded. Our team will now prepare and submit your application.' },
];

export const SERVICE_STEPS0: Record<string, StageDef[]> = {
  'Family & residency': [
    ...start('residence visa'),
    { id: 'submitted', group: S2, name: 'Application submitted', next: 'Your application has been submitted to the authority. We are following it and will update you as soon as there is news.' },
    { id: 'entry-permit', group: S2, name: 'Entry permit issued', next: 'The entry permit has been issued. We will guide you on entering the UAE or changing status, where this applies.' },
    { id: 'cos', group: S2, name: 'Change of status', next: 'The status change inside the UAE is being processed. We will tell you when it is completed.' },
    { id: 'medical', group: S2, name: 'Medical test', next: 'The medical fitness test is the next step. We will share the appointment details and instructions.' },
    { id: 'insurance', group: S2, name: 'Health insurance', next: 'We are arranging the required health insurance. Please send any details the insurer asks for.' },
    { id: 'biometrics', group: S2, name: 'Emirates ID biometrics', next: 'Emirates ID biometrics is the next step, where it applies. Please attend at the scheduled time with your passport.' },
    { id: 'approved', group: S3, name: 'Residence visa issued', next: 'The residence visa has been issued. We are now following the Emirates ID printing and delivery.' },
    { id: 'eid-delivered', group: S3, name: 'Emirates ID delivered', next: 'The Emirates ID has been delivered and your file is complete. Thank you for choosing us.' },
  ],
  Visas: [
    ...start('visa'),
    { id: 'submitted', group: S2, name: 'Application submitted', next: 'Your visa application has been submitted. We are following it and will update you as soon as there is news.' },
    { id: 'entry-permit', group: S2, name: 'Entry permit / e-visa issued', next: 'The entry permit or e-visa has been issued. We have shared it with you. Please check the dates and details.' },
    { id: 'medical', group: S2, name: 'Medical & biometrics', next: 'The medical test and biometrics are the next step, where they apply. We will send the appointment details.' },
    { id: 'approved', group: S3, name: 'Visa issued', next: 'Your visa has been issued. Please keep a copy with your passport.' },
    { id: 'completed', group: S3, name: 'Completed', next: 'Your file is complete. Thank you for choosing us.' },
  ],
  Employment: [
    ...start('employment visa'),
    { id: 'work-permit', group: S2, name: 'Work permit application', next: 'The work permit application has been submitted. We will update you when it is approved.' },
    { id: 'wp-approved', group: S2, name: 'Work permit approved', next: 'The work permit has been approved. We are now preparing the entry permit or status change.' },
    { id: 'entry-permit', group: S2, name: 'Entry permit issued', next: 'The entry permit has been issued. We will guide you on the next step.' },
    { id: 'medical', group: S2, name: 'Medical test', next: 'The medical fitness test is the next step. We will share the appointment details.' },
    { id: 'biometrics', group: S2, name: 'Emirates ID biometrics', next: 'Emirates ID biometrics is the next step, where it applies. Please attend at the scheduled time.' },
    { id: 'contract', group: S2, name: 'Labour contract signed', next: 'The labour contract is ready for signature. Please sign it so the residence visa can be issued.' },
    { id: 'approved', group: S3, name: 'Residence visa issued', next: 'The residence visa has been issued. We are following the Emirates ID delivery.' },
    { id: 'completed', group: S3, name: 'Completed', next: 'Your file is complete. Thank you for choosing us.' },
  ],
  'Property & documents': [
    ...start('document'),
    { id: 'in-process', group: S2, name: 'In process', next: 'Your request is being processed with the relevant authority. We will update you as soon as there is news.' },
    { id: 'ready', group: S3, name: 'Document ready', next: 'Your document is ready. You can download it from your dashboard.' },
    { id: 'completed', group: S3, name: 'Completed', next: 'Your request is complete. Thank you for choosing us.' },
  ],
  'Visa services': [
    ...start('service'),
    { id: 'in-process', group: S2, name: 'In process', next: 'Your request is being processed. We will update you as soon as there is news.' },
    { id: 'appointment', group: S2, name: 'Appointment', next: 'An appointment is the next step, where it applies. We will share the date, time and place.' },
    { id: 'completed', group: S3, name: 'Completed', next: 'Your request is complete. Thank you for choosing us.' },
  ],
  'Other services': [
    ...start('service'),
    { id: 'in-process', group: S2, name: 'In process', next: 'Your request is being processed. We will update you as soon as there is news.' },
    { id: 'completed', group: S3, name: 'Completed', next: 'Your request is complete. Thank you for choosing us.' },
  ],
};

/** Which step list a service (its group in the apply form) uses. */
export function stepServiceOf(group?: string): string {
  if (!group) return DEFAULT_SERVICE;
  if ((STEP_SERVICES as readonly string[]).includes(group)) return group;
  if (/golden/i.test(group)) return DEFAULT_SERVICE;
  if (/family|residen/i.test(group)) return 'Family & residency';
  if (/employ|work/i.test(group)) return 'Employment';
  if (/visa service/i.test(group)) return 'Visa services';
  if (/visa/i.test(group)) return 'Visas';
  if (/property|document|attest|legal/i.test(group)) return 'Property & documents';
  return 'Other services';
}

/** Step names a file shows, from the translated map (falls back to the Golden Visa list). */
export function namesFor(t: { stages: string[]; stageMap?: Record<string, string[]> }, a: { stepGroup?: string }): string[] {
  return (a.stepGroup && t.stageMap?.[a.stepGroup]) || t.stages;
}
