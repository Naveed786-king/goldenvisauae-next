import 'server-only';
// WhatsApp templates of the client system (the same set as the Abu Dhabi Golden Visa site, named gvuae_…):
// "Create all templates in Meta" sends them for approval, "Check approval" fills in the approved names.
// Templates ending in _btn_vN carry an "Open my file" button (the client's secret file link, or the file in the
// admin for team alerts); templates with _pdf_ in the name carry the quote or receipt PDF in their header.
import { getSetting, saveSetting } from '@/lib/settings';
import type { NotifyEvent } from './config';

const GRAPH = 'https://graph.facebook.com/v21.0';
const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://goldenvisauae.ai').replace(/\/+$/, '');

export type Tpl = { event: NotifyEvent; name: string; text: string; ex: string[]; header?: 'DOCUMENT'; buttons: { text: string; url: string; ex: string }[] };

export function metaTemplates(): Tpl[] {
  const file = { text: 'Open my file', url: `${SITE()}/t/{{1}}`, ex: '0123456789abcdef0123456789abcdef' };
  const admin = { text: 'Open in admin', url: `${SITE()}/admin/applications/{{1}}`, ex: 'cmwrwwags007ufixvoakckm7a' };
  return [
    { event: 'quote', name: 'gvuae_quote_pdf_btn_v1', header: 'DOCUMENT', text: 'Hello {{1}}, your quotation for file {{2}} ({{3}}) is ready. Total: {{4}}. The quotation PDF is attached. Tap the button below to review and accept it.', ex: ['Sara', 'RGV-2611-AB12C', 'UAE Golden Visa', 'AED 7,425.00'], buttons: [file] },
    { event: 'paid', name: 'gvuae_payment_receipt_pdf_btn_v1', header: 'DOCUMENT', text: 'Hello {{1}}, we received your payment on file {{2}} for {{3}}. Amount: {{4}}. Receipt: {{5}}. Your official payment receipt is attached as a PDF. Thank you.', ex: ['Sara', 'RGV-2611-AB12C', 'Visa issuance fee', 'AED 1,250.00', 'RGV-2611-AB12C-R1'], buttons: [file] },
    { event: 'welcome', name: 'gvuae_file_opened_btn_v1', text: 'Hello {{1}}, your file {{2}} for {{3}} is open. Follow every step, upload documents and message your advisor in your client dashboard. Tap the button below to open it.', ex: ['Sara', 'RGV-2611-AB12C', 'UAE Golden Visa'], buttons: [file] },
    { event: 'status', name: 'gvuae_status_update_btn_v2', text: 'Hello {{1}}, update on your file {{2}}: {{3}}. Next: {{4}}. Tap the button below for all details.', ex: ['Sara', 'RGV-2611-AB12C', 'Documents check', 'We review your documents'], buttons: [file] },
    // status update with service wording (Meta moved the earlier status templates to marketing)
    { event: 'status', name: 'gvuae_file_step_btn_v1', text: 'Hello {{1}}, application {{2}} update. Current step: {{3}}. Next step: {{4}}. Tap the button below to see your application details.', ex: ['Sara', 'RGV-2611-AB12C', 'Documents check', 'We review your documents'], buttons: [file] },
    { event: 'confirmed', name: 'gvuae_order_accepted_btn_v1', text: 'Hello {{1}}, thank you. Your order {{2}} for {{3}} is confirmed. Total: {{4}}. Tap the button below to pay securely and follow your file.', ex: ['Sara', 'RGV-2611-AB12C', 'UAE Golden Visa', 'AED 7,425.00'], buttons: [{ ...file, text: 'Pay now' }] },
    { event: 'payment', name: 'gvuae_payment_request_btn_v1', text: 'Hello {{1}}, a payment is requested on file {{2}}: {{3}}, {{4}}. Tap the button below to pay securely by card.', ex: ['Sara', 'RGV-2611-AB12C', 'Visa issuance fee', 'AED 1,250.00'], buttons: [{ ...file, text: 'Pay now' }] },
    { event: 'message', name: 'gvuae_new_message_btn_v1', text: 'Hello {{1}}, your advisor wrote to you on file {{2}}: "{{3}}". Tap the button below to read and reply.', ex: ['Sara', 'RGV-2611-AB12C', 'Please upload your passport copy'], buttons: [file] },
    { event: 'document', name: 'gvuae_document_ready_btn_v1', text: 'Hello {{1}}, a new document is ready on file {{2}}: {{3}}. Tap the button below to open it.', ex: ['Sara', 'RGV-2611-AB12C', 'Entry permit'], buttons: [file] },
    { event: 'decision', name: 'gvuae_decision_btn_v1', text: 'Hello {{1}}, the authority decision on your file {{2}}: {{3}}. {{4}}. Tap the button below for the details.', ex: ['Sara', 'RGV-2611-AB12C', 'Approved', 'Your visa is ready'], buttons: [file] },
    { event: 'teamApplication', name: 'gvuae_team_application_btn_v1', text: 'New application: {{1}}, phone {{2}}, email {{3}}, service {{4}}, file {{5}}. Tap the button below to open it in the admin.', ex: ['Sara Ahmed', '+971500000001', 'sara@example.com', 'UAE Golden Visa', 'RGV-2611-AB12C'], buttons: [admin] },
    { event: 'teamPayment', name: 'gvuae_team_payment_btn_v1', text: 'Payment received from {{1}} on file {{2}}: {{3}}, {{4}}. Tap the button below to open the file.', ex: ['Sara Ahmed', 'RGV-2611-AB12C', 'Visa issuance fee', 'AED 1,250.00'], buttons: [admin] },
    { event: 'teamMessage', name: 'gvuae_team_message_btn_v1', text: 'New message from {{1}} on file {{2}}: "{{3}}". Tap the button below to reply.', ex: ['Sara Ahmed', 'RGV-2611-AB12C', 'I uploaded my passport'], buttons: [admin] },
    { event: 'teamSlip', name: 'gvuae_team_slip_btn_v2', text: 'Bank transfer slip received. {{1}} uploaded a bank transfer slip on file {{2}}: {{3}}, {{4}}. Please check it and confirm the payment.', ex: ['Sara Ahmed', 'RGV-2611-AB12C', 'Visa issuance fee', 'AED 1,250.00'], buttons: [admin] },
  ];
}

async function graph(path: string, token: string, init?: RequestInit) {
  const r = await fetch(`${GRAPH}/${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) });
  const j = (await r.json().catch(() => ({}))) as { error?: { message?: string; error_user_msg?: string }; [k: string]: unknown };
  return { ok: r.ok, j, err: j.error?.error_user_msg || j.error?.message || `HTTP ${r.status}` };
}

/** Meta needs an example file for a template with a document header: a small sample PDF is uploaded
 *  with the resumable upload API of the app and its handle is used. */
async function sampleDocHandle(token: string): Promise<string> {
  const app = await graph('app', token);
  const appId = (app.j as { id?: string }).id;
  if (!app.ok || !appId) throw new Error(app.err || 'app id not found');
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 300]);
  page.drawText('Sample document - Golden Visa UAE', { x: 30, y: 250, size: 14, font: await pdf.embedFont(StandardFonts.Helvetica) });
  const bytes = await pdf.save();
  const s = await graph(`${appId}/uploads?file_name=sample.pdf&file_length=${bytes.length}&file_type=application/pdf`, token, { method: 'POST' });
  const sid = (s.j as { id?: string }).id;
  if (!s.ok || !sid) throw new Error(s.err || 'no upload session');
  const r = await fetch(`${GRAPH}/${sid}`, { method: 'POST', headers: { Authorization: `OAuth ${token}`, file_offset: '0' }, body: Buffer.from(bytes), signal: AbortSignal.timeout(20000) });
  const j = (await r.json().catch(() => ({}))) as { h?: string; error?: { message?: string } };
  if (!r.ok || !j.h) throw new Error(j.error?.message || `HTTP ${r.status}`);
  return j.h;
}

/** Sends every template to Meta for approval. Templates that already exist are left as they are. */
export async function createMetaTemplates() {
  const w = await getSetting('whatsapp');
  if (!w.businessId || !w.accessToken) return { ok: false, msg: 'Add the WhatsApp Business account ID and the access token first (and save).' };
  const done: string[] = [], had: string[] = [], failed: string[] = [];
  let handle = '';
  for (const t of metaTemplates()) {
    const comps: unknown[] = [{ type: 'BODY', text: t.text, example: { body_text: [t.ex] } }];
    comps.push({ type: 'BUTTONS', buttons: t.buttons.map((b) => ({ type: 'URL', text: b.text, url: b.url, example: [b.url.replace('{{1}}', b.ex)] })) });
    if (t.header === 'DOCUMENT') {
      handle ||= await sampleDocHandle(w.accessToken).catch((e) => { failed.push(`${t.name}: sample file upload failed (${(e as Error).message})`); return ''; });
      if (!handle) continue;
      comps.unshift({ type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [handle] } });
    }
    const r = await graph(`${encodeURIComponent(w.businessId)}/message_templates`, w.accessToken, { method: 'POST', body: JSON.stringify({ name: t.name, language: 'en', category: 'UTILITY', components: comps }) });
    if (r.ok) done.push(t.name);
    else if (/already exists|duplicate|already (has |)?\w* ?content/i.test(r.err)) had.push(t.name);
    else failed.push(`${t.name}: ${r.err}`);
  }
  const msg = [done.length ? `Sent to Meta for approval: ${done.length}.` : '', had.length ? `Already there: ${had.length}.` : '', failed.length ? `Not accepted: ${failed.join(' | ')}` : '', 'Approval usually takes a few minutes; then press “Check approval”.'].filter(Boolean).join(' ');
  return { ok: failed.length === 0, msg };
}

/** Reads the templates from Meta and fills in the names of the approved ones. */
export async function syncMetaTemplates() {
  const w = await getSetting('whatsapp');
  if (!w.businessId || !w.accessToken) return { ok: false, msg: 'Add the WhatsApp Business account ID and the access token first (and save).', rows: [] as { name: string; status: string }[] };
  const r = await graph(`${encodeURIComponent(w.businessId)}/message_templates?fields=name,status,language,category&limit=250`, w.accessToken);
  if (!r.ok) return { ok: false, msg: `Meta said: ${r.err}`, rows: [] };
  const rows = (r.j.data as { name: string; status: string; category?: string }[]) ?? [];
  const templates = { ...(w.templates ?? {}) };
  const report: { name: string; status: string }[] = [];
  for (const t of metaTemplates()) {
    const m = rows.find((x) => x.name === t.name);
    const st = (m?.status ?? 'NOT CREATED').toLowerCase().replace('_', ' ');
    if (m?.status === 'APPROVED' && (!m.category || m.category === 'UTILITY')) templates[t.event] = t.name;
    report.push({ name: t.name, status: st + (m?.category && m.category !== 'UTILITY' ? ` (moved to ${m.category.toLowerCase()} by Meta)` : '') });
  }
  await saveSetting('whatsapp', { ...w, templates, templateLang: 'en' });
  const n = report.filter((x) => x.status === 'approved').length;
  return { ok: true, msg: `${n} of ${report.length} approved and filled in.`, rows: report };
}
