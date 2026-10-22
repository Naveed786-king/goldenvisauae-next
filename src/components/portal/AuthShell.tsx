import { Check } from 'lucide-react';
import T from '@/components/ui/T';
import { Emblem } from '@/components/site/Logo';
import Particles from '@/components/site/Particles';

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const perks = ['Track your visa application in real time', 'Upload documents securely', 'Chat directly with your consultant', 'Get instant status notifications'];
  return (
    <section className="hero-stage theme-light">
      <div className="hero-aurora" />
      <div className="container-x grid min-h-[calc(100vh-80px)] items-center gap-10 pb-16 pt-[7.25rem] lg:grid-cols-2 lg:pt-[8.5rem]">
        <div className="ink-panel theme-dark relative hidden h-full min-h-[560px] p-12 lg:block">
          <Particles density={0.5} />
          <div className="relative">
            <span className="grid h-16 w-16 place-items-center rounded-2xl text-[#2a1d05]" style={{ background: 'var(--gold-grad)' }}>
              <Emblem className="h-10 w-10" />
            </span>
            <h2 className="mt-8 font-display text-4xl font-semibold leading-tight text-white">
              <T>Your Golden Visa journey, in one place.</T>
            </h2>
            <ul className="mt-10 space-y-4">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-3 text-white/80">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gold/20 text-gold-light">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <T>{p}</T>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md">
          <h1 className="h-display text-4xl md:text-5xl">
            <T>{title}</T>
          </h1>
          {subtitle && (
            <p className="lead mt-3">
              <T>{subtitle}</T>
            </p>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </section>
  );
}
