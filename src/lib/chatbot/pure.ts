// Pure chatbot helpers (no imports) — unit-testable with plain Node.

/** Luhn check for card numbers */
function luhn(d: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Masks personal ID numbers a visitor may type: Emirates ID, passport numbers and payment cards.
 * Phone numbers and emails are kept (the visitor shares them so we can call back).
 */
export function maskPersonalIds(text: string): { text: string; masked: string[] } {
  const masked: string[] = [];
  let t = String(text || '');
  // Emirates ID: 784-YYYY-NNNNNNN-N (with or without dashes/spaces)
  t = t.replace(/\b784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d\b/g, () => (masked.push('emirates_id'), '[Emirates ID removed]'));
  // card numbers: 13-19 digits (spaces/dashes allowed) passing Luhn
  t = t.replace(/\b(?:\d[ -]?){13,19}\b/g, (m) => {
    const d = m.replace(/\D/g, '');
    if (d.length >= 13 && d.length <= 19 && luhn(d) && !/^(00|\+|971)/.test(m.trim())) {
      masked.push('card');
      return '[card number removed]';
    }
    return m;
  });
  // passport-like: 1-2 letters followed by 6-9 digits (e.g. A1234567, AB1234567), or after the word passport
  t = t.replace(/\b(passport(?:\s*(?:no|number|#))?\s*[:#]?\s*)([A-Z0-9]{6,10})\b/gi, (_m, pre) => (masked.push('passport'), `${pre}[passport number removed]`));
  t = t.replace(/\b[A-Z]{1,2}\d{6,9}\b/g, () => (masked.push('passport'), '[passport number removed]'));
  return { text: t, masked };
}

/** Finds a phone number and an email in a visitor message */
export function findContact(text: string): { phone?: string; email?: string } {
  const email = String(text || '').match(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/i)?.[0];
  const phoneRaw = String(text || '').match(/(?:\+|00)?\d[\d\s().-]{7,16}\d/)?.[0];
  const digits = phoneRaw?.replace(/\D/g, '') || '';
  const phone = digits.length >= 8 && digits.length <= 15 ? (phoneRaw!.trim().startsWith('+') || phoneRaw!.trim().startsWith('00') ? '+' : '') + digits.replace(/^00/, '') : undefined;
  return { phone, email };
}

/** wa.me link with a prefilled message */
export function whatsappLink(number: string, text: string): string {
  const n = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(text.slice(0, 1500))}`;
}

/** Light prompt-injection guard: strips markup and role-like prefixes from visitor text */
export function cleanVisitorText(text: string, max = 600): string {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/^\s*(system|assistant|developer)\s*:/gim, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export const HANDOVER_REASONS = ['apply', 'quote', 'unknown', 'human'] as const;
export type HandoverReason = (typeof HANDOVER_REASONS)[number];
