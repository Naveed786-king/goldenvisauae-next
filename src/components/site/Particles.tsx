'use client';
import { useEffect, useRef } from 'react';

/**
 * Golden 3D particle field (pure canvas, no libraries, ~3 KB).
 * - A slowly turning sphere of gold points with an orbit ring, projected in real 3D perspective.
 * - Floating gold dust that drifts up and gently moves away from the pointer / finger.
 * - Follows the pointer (tilts towards it), pauses when off screen or in a background tab,
 *   draws one still frame when the visitor prefers reduced motion.
 */
type P3 = { x: number; y: number; z: number; s: number };
type Dust = { x: number; y: number; vx: number; vy: number; r: number; a: number };

export default function Particles({ className = 'particles', density = 1, focus = 'center' }: { className?: string; density?: number; focus?: 'center' | 'card' }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 767px)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);

    let w = 0;
    let h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // sphere (fibonacci lattice) + tilted ring
    const nSphere = Math.round((small ? 260 : 520) * density);
    const nRing = Math.round((small ? 120 : 220) * density);
    const pts: P3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < nSphere; i++) {
      const y = 1 - (i / (nSphere - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      pts.push({ x: Math.cos(th) * rad, y, z: Math.sin(th) * rad, s: 0.6 + Math.random() * 0.8 });
    }
    const tilt = 0.42;
    for (let i = 0; i < nRing; i++) {
      const a = (i / nRing) * Math.PI * 2;
      const rr = 1.55 + (Math.random() - 0.5) * 0.12;
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      pts.push({ x, y: z * Math.sin(tilt) + (Math.random() - 0.5) * 0.04, z: z * Math.cos(tilt), s: 0.5 + Math.random() * 0.6 });
    }
    const dust: Dust[] = Array.from({ length: Math.round((small ? 18 : 40) * density) }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00012,
      vy: -0.00008 - Math.random() * 0.00018,
      r: 0.6 + Math.random() * 1.8,
      a: 0.18 + Math.random() * 0.4,
    }));

    let rotY = 0;
    let rotX = -0.25;
    let targetX = -0.25;
    let targetY = 0;
    let px = -9999;
    let py = -9999;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
      targetY = ((px / r.width) - 0.5) * 0.9;
      targetX = -0.25 + ((py / r.height) - 0.5) * 0.5;
    };
    const onLeave = () => {
      px = py = -9999;
      targetX = -0.25;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.5;
      // 'card': the globe surrounds the floating visa card (lower part of the hero), keeping the title clear
      const cy = focus === 'card' ? h * (small ? 0.8 : 0.74) : h * 0.46;
      const R = focus === 'card' ? Math.min(w * (small ? 0.46 : 0.3), h * 0.3) : Math.min(w, h) * (small ? 0.34 : 0.3);
      const fov = 3.2;
      rotX += (targetX - rotX) * 0.04;
      const spin = rotY + targetY;
      const cosY = Math.cos(spin);
      const sinY = Math.sin(spin);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      for (const p of pts) {
        // rotate Y then X
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const k = fov / (fov + z2);
        const sx = cx + x1 * R * k;
        const sy = cy + y2 * R * k;
        const depth = (1 - z2) / 2; // 0 back … 1 front
        const alpha = 0.1 + depth * 0.6;
        const size = p.s * (0.55 + depth * 1.35) * k;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = depth > 0.62 ? '#c9a24a' : depth > 0.35 ? '#d8b86a' : '#e9d29b';
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // dust
      for (const d of dust) {
        d.x += d.vx * 16;
        d.y += d.vy * 16;
        if (d.y < -0.02) {
          d.y = 1.02;
          d.x = Math.random();
        }
        if (d.x < -0.02) d.x = 1.02;
        if (d.x > 1.02) d.x = -0.02;
        let x = d.x * w;
        let y = d.y * h;
        const dx = x - px;
        const dy = y - py;
        const dist = Math.hypot(dx, dy);
        if (dist < 120) {
          const f = (120 - dist) / 120;
          x += (dx / (dist || 1)) * f * 26;
          y += (dy / (dist || 1)) * f * 26;
        }
        ctx.globalAlpha = d.a * (0.6 + 0.4 * Math.sin(t / 900 + d.r * 3));
        ctx.fillStyle = '#c9a24a';
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    let visible = true;
    let last = performance.now();
    const loop = (t: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min(48, t - last);
      last = t;
      rotY += dt * 0.00011;
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!raf && !reduce) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);
    const onVis = () => !document.hidden && start();
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(0);
    });
    ro.observe(canvas);
    if (reduce) draw(0);
    else start();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [density, focus]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
