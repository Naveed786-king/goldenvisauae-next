'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, FileText, Fingerprint, Pause, Play, Stethoscope, Sparkles, ShieldCheck } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/components/site/SiteProvider';
import { Emblem } from '@/components/site/Logo';
import { cn } from '@/lib/utils';
import { lines } from './parts';

export type JourneyStep = { scene?: string; icon?: string; title: string; body?: string; a?: string; b?: string; items?: string };

const SCENES = ['chat', 'docs', 'scan', 'stamp', 'card'];

/* ------------------------------------------------------------------ the five little "films" */
function Scene({ step, index }: { step: JourneyStep; index: number }) {
  const kind = SCENES.includes(step.scene || '') ? step.scene : SCENES[index % SCENES.length];
  if (kind === 'chat')
    return (
      <div className="vj-scene vj-chat">
        <div className="vj-phone">
          <div className="vj-phone-top">
            <span className="vj-avatar">
              <Emblem className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <b>Golden Visa UAE</b>
              <i>online</i>
            </span>
          </div>
          <p className="vj-bubble vj-in" style={{ animationDelay: '.2s' }}>
            {step.a || 'Hi! Do I qualify for the Golden Visa?'}
          </p>
          <p className="vj-typing" style={{ animationDelay: '.9s' }}>
            <span />
            <span />
            <span />
          </p>
          <p className="vj-bubble vj-out" style={{ animationDelay: '1.8s' }}>
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{step.b || 'Yes — you qualify. Free written assessment sent.'}</span>
          </p>
        </div>
      </div>
    );
  if (kind === 'docs') {
    const docs = lines(step.items).slice(0, 4);
    const list = docs.length ? docs : ['Passport', 'Title deed', 'Photo', 'Emirates ID'];
    return (
      <div className="vj-scene vj-docs">
        {list.map((d, i) => (
          <div key={i} className="vj-doc" style={{ ['--i' as any]: i }}>
            <span className="vj-doc-ico">
              <FileText className="h-5 w-5" />
            </span>
            <span className="vj-doc-lines">
              <b>{d}</b>
              <i />
              <i />
            </span>
            <span className="vj-tick">
              <Check className="h-3.5 w-3.5" />
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'scan')
    return (
      <div className="vj-scene vj-scan">
        <div className="vj-finger">
          <span className="vj-ring" />
          <span className="vj-ring" style={{ animationDelay: '.6s' }} />
          <Fingerprint className="vj-fp" strokeWidth={1.3} />
          <span className="vj-beam" />
        </div>
        <svg viewBox="0 0 220 60" className="vj-pulse" aria-hidden>
          <path d="M0 30 H60 L72 12 L86 50 L98 22 L108 36 L118 30 H220" />
        </svg>
        <div className="vj-chips">
          <span>
            <Stethoscope className="h-3.5 w-3.5" /> {step.a || 'Medical — fit'}
          </span>
          <span style={{ animationDelay: '1.6s' }}>
            <Fingerprint className="h-3.5 w-3.5" /> {step.b || 'Biometrics — done'}
          </span>
        </div>
      </div>
    );
  if (kind === 'stamp')
    return (
      <div className="vj-scene vj-stamp">
        <div className="vj-form">
          <div className="vj-form-head">
            <span className="vj-avatar !h-8 !w-8">
              <Emblem className="h-4 w-4" />
            </span>
            <span>
              <b>{step.a || 'Residency application'}</b>
              <i>GDRFA · ICP</i>
            </span>
          </div>
          <i className="vj-line" />
          <i className="vj-line w-4/5" />
          <i className="vj-line w-3/5" />
          <i className="vj-line w-2/3" />
          <span className="vj-seal">{step.b || 'APPROVED'}</span>
        </div>
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="vj-confetti" style={{ ['--a' as any]: `${i * 25.7}deg`, ['--d' as any]: `${60 + (i % 4) * 22}px` }} />
        ))}
      </div>
    );
  return (
    <div className="vj-scene vj-cardscene">
      <div className="vj-gcard">
        <div className="vj-gcard-in">
          <div className="flex items-start justify-between">
            <Emblem className="h-9 w-9 text-[#3b2a08]" />
            <span className="vj-chip" />
          </div>
          <div>
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-[#3b2a08]/70">{step.b || 'United Arab Emirates'}</p>
            <p className="mt-1 text-[1.35rem] font-semibold uppercase leading-none tracking-[-0.01em] text-[#1a1406]">{step.a || 'Golden Visa'}</p>
            <p className="mt-1 text-[0.65rem] font-medium text-[#3b2a08]/75">10 · YEARS</p>
          </div>
        </div>
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <Sparkles key={i} className="vj-spark" style={{ ['--a' as any]: `${i * 36}deg`, animationDelay: `${0.9 + (i % 5) * 0.12}s` }} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ player */
export default function VisaJourney({ steps, seconds = 3.8 }: { steps: JourneyStep[]; seconds?: number }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const n = steps.length;
  const ms = Math.max(2, Math.min(12, Number(seconds) || 3.8)) * 1000;

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = playing && visible && !reduced && n > 1;
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setI((x) => (x + 1) % n), ms);
    return () => window.clearTimeout(id);
  }, [running, i, n, ms]);

  if (!n) return null;
  const cur = steps[i];
  return (
    <div ref={ref} className="grid items-center gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:gap-12">
      {/* the screen */}
      <div className="vj-wrap [perspective:1600px]">
        <div className="vj-screen tilt" data-tilt="6">
          <div className="vj-bar">
            <span className="vj-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="vj-live">
              <span className={cn('h-1.5 w-1.5 rounded-full', running ? 'bg-red-500' : 'bg-[#a1a1a6]')} style={running ? { animation: 'pulse-dot 1.4s ease-out infinite' } : undefined} />
              {t('Step')} {i + 1} / {n}
            </span>
            <button type="button" onClick={() => setPlaying((p) => !p)} className="vj-play" aria-label={playing ? t('Pause') : t('Play')}>
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="vj-stage">
            <div key={i} className="vj-stage-in">
              <Scene step={cur} index={i} />
            </div>
            <div className="vj-caption" key={`c${i}`}>
              <span className="vj-cap-ico">
                <Icon name={cur.icon || 'check'} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <b>{cur.title}</b>
                {cur.body && <i>{cur.body}</i>}
              </span>
            </div>
          </div>
          <div className="vj-progress">
            {steps.map((_, k) => (
              <button key={k} type="button" onClick={() => setI(k)} aria-label={`${t('Step')} ${k + 1}`} className="vj-seg">
                <span
                  className={cn(k < i && 'is-done', k === i && 'is-now')}
                  style={k === i ? { animationDuration: `${ms}ms`, animationPlayState: running ? 'running' : 'paused' } : undefined}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* chapter list */}
      <ol className="vj-steps">
        {steps.map((s, k) => (
          <li key={k}>
            <button type="button" onClick={() => setI(k)} className={cn('vj-step', k === i && 'is-on', k < i && 'is-past')}>
              <span className="vj-num">{k < i ? <Check className="h-4 w-4" /> : String(k + 1).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="block font-display text-[1rem] font-semibold leading-snug">{s.title}</span>
                {s.body && <span className="vj-step-body">{s.body}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <span className="sr-only" aria-live="polite">
        {cur.title}
      </span>
    </div>
  );
}
