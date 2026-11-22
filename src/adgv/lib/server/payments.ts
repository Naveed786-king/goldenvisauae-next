import 'server-only';
// Payment settings for the dashboard pages (Admin > Client system > Payments).
import { getSetting } from '@/lib/settings';
import { payOnline } from '@/lib/portal/payments';
import type { PaymentSettings } from '@/lib/portal/config';
import type { Application } from './store';

export type PayCfg = PaymentSettings & { bankWa: boolean; termsUrl: string; validDays: number };
export async function getPayCfg(): Promise<PayCfg> {
  const c = await getSetting('payments');
  return { ...c, bankWa: false, termsUrl: '/terms', validDays: 7 };
}
export const online = (c: PaymentSettings) => payOnline(c);
export const orderTotal = (a: Application) => a.quote.lines.reduce((s, l) => s + l.amount, 0) + a.quote.serviceFee + a.quote.vat;
/** What is still open on a quote after every payment request (paid or not). */
export const orderBalance = (a: Application) => Math.round((orderTotal(a) - a.payments.reduce((s, p) => s + p.amount, 0)) * 100) / 100;
