import { Emblem } from './Logo';

/* CSS-only preloader: fades out by itself in under a second, even before JavaScript loads. */
export default function Preloader() {
  return (
    <div aria-hidden className="preloader fixed inset-0 z-[100] grid place-items-center bg-white">
      <div className="flex flex-col items-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl text-[#2a1d05] shadow-[0_18px_40px_-16px_rgba(150,110,30,.9)]" style={{ background: 'var(--gold-grad)', animation: 'pop .5s cubic-bezier(.2,.8,.2,1) both' }}>
          <Emblem className="h-9 w-9" />
        </span>
        <div className="preloader-line mt-5 h-px w-36 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>
    </div>
  );
}
