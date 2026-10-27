'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useLocale, useT } from '@/components/site/SiteProvider';
import { SocialIcon } from '@/components/ui/Icon';
import type { ChatWidgetConfig } from './ChatLoader';

type Msg = { role: 'user' | 'bot'; text: string; wa?: string };
const STORE = 'gv-chat-v1';
const TEASER = 'gv-chat-teaser'; // when the visitor last closed the greeting bubble
const TEASER_PAUSE = 24 * 3_600_000;

function load(): { sessionId?: string; visitorId: string; messages: Msg[] } {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (v?.visitorId) return v;
  } catch {
    /* storage blocked */
  }
  return { visitorId: Math.random().toString(36).slice(2) + Date.now().toString(36), messages: [] };
}

function persist(v: { sessionId?: string; visitorId: string; messages: Msg[] }) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ ...v, messages: v.messages.slice(-40) }));
  } catch {
    /* ignore */
  }
}

function teaserAllowed(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(TEASER) || 0) > TEASER_PAUSE;
  } catch {
    return true; // storage blocked: still greet once per page view
  }
}

function rememberTeaserClosed() {
  try {
    localStorage.setItem(TEASER, String(Date.now()));
  } catch {
    /* storage blocked: the bubble simply shows again next time */
  }
}

/** Turns "/services/x" or "/blog/y" in bot text into links (text stays plain — no HTML from the AI) */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\/(?:services|blog|apply|contact|check-visa-status)[a-z0-9/_-]*)/gi);
  return (
    <>
      {parts.map((p, i) =>
        /^\/(services|blog|apply|contact|check-visa-status)/i.test(p) ? (
          <a key={i} href={p} className="font-semibold underline underline-offset-2">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function ChatWidget({ cfg }: { cfg: ChatWidgetConfig }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(load);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // A chat the team deleted in the admin disappears here too (checked on load, on opening and on return)
  useEffect(() => {
    let stop = false;
    const check = async () => {
      const cur = load();
      if (!cur.sessionId) return;
      try {
        const r = await fetch(`/api/chat?sessionId=${encodeURIComponent(cur.sessionId)}&visitorId=${encodeURIComponent(cur.visitorId)}`, { cache: 'no-store' });
        if (!r.ok) return; // offline or rate-limited: keep the chat as it is
        const d = await r.json();
        if (stop || d.active !== false) return;
        const fresh = { visitorId: cur.visitorId, messages: [] as Msg[] };
        persist(fresh);
        setState(fresh);
      } catch (e) {
        console.warn('[chat] could not check the saved chat:', e instanceof Error ? e.message : e);
      }
    };
    check();
    const onShow = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      stop = true;
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [open]);

  // New visitors: a small "Can I help you?" bubble next to the chat button after a few seconds
  useEffect(() => {
    if (open || state.messages.length || !teaserAllowed()) return;
    const id = window.setTimeout(() => setTeaser(true), 4000);
    return () => window.clearTimeout(id);
  }, [open, state.messages.length]);

  const openChat = () => {
    setTeaser(false);
    rememberTeaserClosed();
    setOpen(true);
  };
  const closeTeaser = () => {
    setTeaser(false);
    rememberTeaserClosed();
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages, busy, open]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput('');
    const next = { ...state, messages: [...state.messages, { role: 'user' as const, text: msg }] };
    setState(next);
    setBusy(true);
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: msg, sessionId: state.sessionId, visitorId: state.visitorId, locale, page: location.pathname }) });
      const d = await r.json();
      const bot: Msg = r.ok ? { role: 'bot', text: d.reply, wa: d.handover?.url } : { role: 'bot', text: d.error || t('Sorry, something went wrong. Please try again.') };
      // the server removed an ID/card number: hide it on this screen too
      const shown = d.masked ? next.messages.map((m, i) => (i === next.messages.length - 1 ? { ...m, text: m.text.replace(/\b784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d\b|\b(?:\d[ -]?){13,19}\b|\b[A-Z]{1,2}\d{6,9}\b/g, '••••') } : m)) : next.messages;
      const v = { ...next, sessionId: d.sessionId || next.sessionId, messages: [...shown, bot] };
      setState(v);
      persist(v);
    } catch (e) {
      console.warn('[chat] message failed:', e instanceof Error ? e.message : e);
      setState({ ...next, messages: [...next.messages, { role: 'bot', text: t('Sorry, something went wrong. Please try again.') }] });
    } finally {
      setBusy(false);
    }
  }

  const side = cfg.position === 'start' ? 'start-4 lg:start-6 bottom-[168px] lg:bottom-[80px]' : 'end-4 lg:end-6 bottom-[164px] lg:bottom-[92px]';
  const suggestions = [t('What does the Golden Visa cost?'), t('Can I sponsor my family?'), t('Talk to a consultant')];

  return (
    <div className={`fixed z-[60] flex flex-col gap-3 ${side} ${cfg.position === 'start' ? 'items-start' : 'items-end'}`}>
      {open && (
        <div role="dialog" aria-label={cfg.botName} className="flex h-[min(560px,calc(100dvh-220px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-25px_rgba(0,0,0,.5)] ring-1 ring-black/5" style={{ animation: 'pop .3s cubic-bezier(.2,.8,.2,1) both' }}>
          <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: cfg.color }}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{cfg.botName}</p>
              <p className="text-[0.7rem] opacity-75">{t('AI assistant · replies instantly')}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10" aria-label={t('Close')}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#faf8f3] px-4 py-4 text-sm leading-relaxed">
            <div className="max-w-[85%] rounded-2xl rounded-ss-md bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-black/5">{cfg.greeting}</div>
            {state.messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                <div className={m.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-se-md px-3.5 py-2.5 text-white' : 'max-w-[85%] rounded-2xl rounded-ss-md bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-black/5'} style={m.role === 'user' ? { background: cfg.color } : undefined}>
                  <p className="whitespace-pre-line">{m.role === 'bot' ? <Rich text={m.text} /> : m.text}</p>
                  {m.wa && (
                    <a href={m.wa} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white">
                      <SocialIcon name="whatsapp" className="h-4 w-4" /> {t('Continue on WhatsApp')}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="inline-flex gap-1 rounded-2xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-black/5" aria-label={t('Typing…')}>
                {[0, 1, 2].map((k) => (
                  <i key={k} className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40" style={{ animationDelay: `${k * 0.15}s` }} />
                ))}
              </div>
            )}
            {!state.messages.length && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-black/10 hover:ring-black/25">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="flex items-start gap-1.5 border-t border-black/5 bg-white px-4 pt-2 text-[0.68rem] leading-snug text-black/50">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
            {t('Please do not share passport, Emirates ID or card numbers. Chats are saved so our team can help you.')}
          </p>
          <form
            className="flex items-center gap-2 bg-white px-3 pb-3 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={600} placeholder={t('Type your question…')} aria-label={t('Type your question…')} className="h-11 flex-1 rounded-full bg-[#f4f1ea] px-4 text-sm outline-none ring-1 ring-transparent focus:ring-black/15" />
            <button type="submit" disabled={busy || !input.trim()} className="grid h-11 w-11 place-items-center rounded-full text-white disabled:opacity-40" style={{ background: cfg.color }} aria-label={t('Send')}>
              <Send className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </form>
        </div>
      )}
      {teaser && !open && (
        <div className="relative w-[min(260px,calc(100vw-96px))] rounded-2xl rounded-ee-md bg-white p-3.5 pe-9 text-sm shadow-[0_20px_50px_-20px_rgba(0,0,0,.45)] ring-1 ring-black/5 rtl:rounded-ee-2xl rtl:rounded-es-md" style={{ animation: 'pop .4s cubic-bezier(.2,.8,.2,1) both' }}>
          <button type="button" onClick={openChat} className="flex items-start gap-2.5 text-start">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ background: cfg.color }}>
              <Sparkles className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold text-black/90">{t('Hi! 👋 Can I help you?')}</span>
              <span className="mt-0.5 block text-xs leading-snug text-black/55">{t('Ask me about visas, costs or documents — I reply instantly.')}</span>
            </span>
          </button>
          <button type="button" onClick={closeTeaser} aria-label={t('Close')} className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-full text-black/40 hover:bg-black/5 hover:text-black/70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <button type="button" onClick={() => (open ? setOpen(false) : openChat())} aria-expanded={open} aria-label={open ? t('Close') : t('Ask our AI assistant')} className="relative grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_14px_34px_-10px_rgba(0,0,0,.55)] transition-transform hover:scale-105 active:scale-95" style={{ background: cfg.color, animation: 'pop .35s cubic-bezier(.2,.8,.2,1) both' }}>
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {teaser && !open && <span className="absolute -end-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-[#ff3b30] ring-2 ring-white" aria-hidden />}
      </button>
    </div>
  );
}
