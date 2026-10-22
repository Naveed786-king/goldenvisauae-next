// Bridges our auto-translated UI texts to next-intl messages.
// next-intl keys may not contain dots, so every English text gets a short stable key.

/** Stable short key for an English UI text (FNV-1a hash) */
export function uiKey(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 'k' + (h >>> 0).toString(36);
}

/** { ui: { key: translatedText } } for next-intl */
export function toMessages(dict: Record<string, string>) {
  const ui: Record<string, string> = {};
  for (const [en, tr] of Object.entries(dict || {})) if (en && tr) ui[uiKey(en)] = tr;
  return { ui };
}
