'use client';
import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { SocialIcon } from '@/components/ui/Icon';
import { useT } from './SiteProvider';

export default function ShareButtons({ title }: { title: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const share = (net: string) => {
    const url = encodeURIComponent(window.location.href);
    const t = encodeURIComponent(title);
    const map: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${t}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${t}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    window.open(map[net], '_blank', 'noopener,noreferrer,width=640,height=560');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-bold text-ink/60">{t('Share:')}</span>
      {['whatsapp', 'facebook', 'twitter', 'linkedin'].map((n) => (
        <button key={n} onClick={() => share(n)} className="grid h-10 w-10 place-items-center rounded-full bg-sand text-ink/70 hover:bg-gold hover:text-ink transition" aria-label={`Share on ${n}`}>
          <SocialIcon name={n} />
        </button>
      ))}
      <button onClick={copy} className="grid h-10 w-10 place-items-center rounded-full bg-sand text-ink/70 hover:bg-gold hover:text-ink transition" aria-label="Copy link">
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
