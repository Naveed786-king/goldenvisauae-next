// Chatbot settings (Setting key "chatbot"). Keys are masked for the browser like the publisher's.
import { prisma } from '@/lib/db';
import { deepMerge, maskSecrets, unmaskSecrets } from '@/lib/autopublisher/pure';
import type { ProviderId } from '@/lib/autopublisher/config';

export const GREETINGS: Record<string, string> = {
  en: 'Hi! I can answer questions about the UAE Golden Visa, family visas, costs and documents. How can I help?',
  ar: 'مرحبًا! يمكنني الإجابة عن أسئلتك حول الإقامة الذهبية في الإمارات وتأشيرات العائلة والتكاليف والمستندات. كيف أساعدك؟',
  ru: 'Здравствуйте! Я отвечу на вопросы о Золотой визе ОАЭ, семейных визах, стоимости и документах. Чем помочь?',
  tr: 'Merhaba! BAE Altın Vizesi, aile vizeleri, maliyetler ve belgeler hakkındaki sorularınızı yanıtlayabilirim. Nasıl yardımcı olabilirim?',
  zh: '您好！我可以解答有关阿联酋黄金签证、家庭签证、费用和文件的问题。有什么可以帮您？',
  fr: 'Bonjour ! Je réponds à vos questions sur le Golden Visa des EAU, les visas familiaux, les coûts et les documents. Comment puis-je vous aider ?',
  de: 'Hallo! Ich beantworte Fragen zum Golden Visa der VAE, zu Familienvisa, Kosten und Dokumenten. Wie kann ich helfen?',
  es: '¡Hola! Respondo preguntas sobre la Golden Visa de EAU, visados familiares, costes y documentos. ¿En qué puedo ayudarle?',
  ro: 'Bună! Răspund la întrebări despre Golden Visa în EAU, vize de familie, costuri și documente. Cu ce vă pot ajuta?',
  hi: 'नमस्ते! मैं यूएई गोल्डन वीज़ा, फ़ैमिली वीज़ा, लागत और दस्तावेज़ों से जुड़े सवालों के जवाब दे सकता हूँ। मैं कैसे मदद करूँ?',
};

export type ChatConfig = {
  enabled: boolean;
  provider: ProviderId;
  model: string;
  key: string; // own key; empty = use the Auto Publisher / environment key for this provider
  botName: string;
  greetings: Record<string, string>;
  color: string;
  position: 'end' | 'start'; // right / left in left-to-right languages
  whatsapp: string; // empty = site WhatsApp number
  handover: { apply: boolean; quote: boolean; unknown: boolean; human: boolean; askContact: boolean };
  maxRepliesPerDay: number;
  maxMessagesPerChat: number;
  deleteAfterDays: number;
  extraRules: string;
};

export const DEFAULT_CHAT: ChatConfig = {
  enabled: false,
  provider: 'gemini',
  model: 'gemini-3.8-flash',
  key: '',
  botName: 'Golden Visa assistant',
  greetings: GREETINGS,
  color: '#141109',
  position: 'end',
  whatsapp: '',
  handover: { apply: true, quote: true, unknown: true, human: true, askContact: true },
  maxRepliesPerDay: 500,
  maxMessagesPerChat: 30,
  deleteAfterDays: 180,
  extraRules: '',
};

const KEY = 'chatbot';

export async function getChatConfig(): Promise<ChatConfig> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    return deepMerge(DEFAULT_CHAT, row ? JSON.parse(row.value) : {});
  } catch {
    return DEFAULT_CHAT;
  }
}

export async function saveChatConfig(incoming: Partial<ChatConfig>): Promise<ChatConfig> {
  const cur = await getChatConfig();
  const next = deepMerge(cur, unmaskSecrets(incoming || {}, cur));
  const n = (v: any, d: number, a: number, b: number) => Math.min(b, Math.max(a, Math.round(Number.isFinite(Number(v)) ? Number(v) : d)));
  next.maxRepliesPerDay = n(next.maxRepliesPerDay, 500, 0, 100000);
  next.maxMessagesPerChat = n(next.maxMessagesPerChat, 30, 2, 200);
  next.deleteAfterDays = n(next.deleteAfterDays, 180, 0, 3650);
  next.color = /^#[0-9a-f]{3,8}$/i.test(next.color) ? next.color : DEFAULT_CHAT.color;
  next.position = next.position === 'start' ? 'start' : 'end';
  next.botName = String(next.botName || DEFAULT_CHAT.botName).slice(0, 60);
  next.extraRules = String(next.extraRules || '').slice(0, 4000);
  next.whatsapp = String(next.whatsapp || '').replace(/[^\d+]/g, '');
  for (const k of Object.keys(next.greetings || {})) next.greetings[k] = String(next.greetings[k] || '').slice(0, 400);
  const value = JSON.stringify(next);
  await prisma.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  return next;
}

export const publicChatConfig = (c: ChatConfig) => maskSecrets(c);

/** What the website widget needs (no secrets) */
export function widgetConfig(c: ChatConfig, locale: string) {
  return { botName: c.botName, greeting: c.greetings?.[locale] || GREETINGS[locale] || c.greetings?.en || GREETINGS.en, color: c.color, position: c.position };
}
