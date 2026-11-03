import { useEffect, useRef } from "react";

/* A light Canvas 2D starfield laid over the hero photograph: three depth layers that twinkle
   and drift a few pixels with the pointer. With `connect`, the brighter stars nearest the
   pointer are joined into a constellation of the visitor's own. It pauses off-screen, draws once under reduced
   motion, and thins out on small screens. */

type Star = { x: number; y: number; r: number; layer: number; phase: number; speed: number; warm: boolean };

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function Starfield({ reduced, density = 1, className = "", connect = false }: { reduced: boolean; density?: number; className?: string; connect?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, dpr = 1, stars: Star[] = [];
    let raf = 0, visible = true, running = false;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: -9999, py: -9999, link: 0, tlink: 0 };

    const build = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, w < 760 ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const rand = seeded(7);
      const count = Math.round(((w * h) / (w < 760 ? 5200 : 3400)) * density);
      stars = Array.from({ length: count }, () => {
        const layer = rand() < 0.7 ? 0 : rand() < 0.75 ? 1 : 2;
        return { x: rand() * w, y: rand() * h * 0.82, r: [0.45, 0.8, 1.25][layer] * (0.7 + rand() * 0.6), layer, phase: rand() * Math.PI * 2, speed: 0.4 + rand() * 1.4, warm: rand() < 0.12 };
      });
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      for (const s of stars) {
        const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.001 * s.speed + s.phase);
        const px = s.x + pointer.x * (s.layer + 1) * 6;
        const py = s.y + pointer.y * (s.layer + 1) * 4;
        ctx.globalAlpha = tw * (0.35 + s.layer * 0.3);
        ctx.fillStyle = s.warm ? "#ffd9a0" : "#eef2ff";
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.layer === 2) {
          ctx.globalAlpha = tw * 0.12;
          ctx.beginPath();
          ctx.arc(px, py, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (connect) drawLinks();
      ctx.globalAlpha = 1;
    };

    const drawLinks = () => {
      pointer.link += (pointer.tlink - pointer.link) * 0.12;
      if (pointer.link < 0.02) return;
      const R = Math.min(190, w * 0.16);
      const near: { x: number; y: number; d: number }[] = [];
      for (const s of stars) {
        if (s.layer === 0) continue;
        const x = s.x + pointer.x * (s.layer + 1) * 6, y = s.y + pointer.y * (s.layer + 1) * 4;
        const d = Math.hypot(x - pointer.px, y - pointer.py);
        if (d < R) near.push({ x, y, d });
      }
      near.sort((a, b) => a.d - b.d);
      const pts = near.slice(0, 6);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#f1c27a";
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = i === 0 ? { x: pointer.px, y: pointer.py } : pts[i - 1];
        ctx.globalAlpha = pointer.link * 0.55 * (1 - a.d / R);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(a.x, a.y); ctx.stroke();
        ctx.globalAlpha = pointer.link * 0.9 * (1 - a.d / R);
        ctx.fillStyle = "#ffe2b0";
        ctx.beginPath(); ctx.arc(a.x, a.y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = (t: number) => {
      draw(t);
      raf = visible && running ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (reduced) { draw(0); return; }
      if (!raf && visible) { running = true; raf = requestAnimationFrame(loop); }
    };

    build();
    start();
    const ro = new ResizeObserver(() => { build(); if (reduced) draw(0); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
    io.observe(canvas);
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
      if (connect) {
        const r = canvas.getBoundingClientRect();
        pointer.px = e.clientX - r.left;
        pointer.py = e.clientY - r.top;
        // links only form over open sky, not over the copy and controls
        const overUi = (e.target as Element).closest("a, button, input, form, h1, p");
        pointer.tlink = !overUi && pointer.py > 0 && pointer.py < r.height * 0.8 ? 1 : 0;
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", move);
    };
  }, [reduced, density, connect]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
