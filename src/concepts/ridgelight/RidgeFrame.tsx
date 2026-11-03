import { useMemo } from "react";

/* Ridgelight's image frames. Every photograph sits inside an asymmetric outline whose top
   edge is a soft mountain ridge and whose corners are each rounded differently, so the
   frames read as one family without repeating. The outline is a percentage polygon, so it
   holds its shape at any size, and every point is written relative to var(--r):

     y = 100% − (100% − y₀) · r

   At r = 0 the frame is a line along its base; as r rises to 1 the ridge climbs into place
   and uncovers the picture (driven by scroll in RidgelightConcept). The ridge stays inside
   the top ~12% of the frame, clear of the subject. */

/** seed varies the ridge; amp is its depth in %; radii are the bottom-right and bottom-left corners in %. */
export type Shape = { seed: number; amp?: number; radii?: [number, number] };

function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Points (in %) clockwise from the top-left, along the ridge, round the corners and base. */
function outline({ seed, amp = 11, radii = [12, 5] }: Shape): [number, number][] {
  const r = rng(seed);
  const [f1, f2, f3] = [1 + r() * 0.8, 2.6 + r() * 1.4, 6 + r() * 3];
  const [p1, p2, p3] = [r() * 6.28, r() * 6.28, r() * 6.28];
  const pts: [number, number][] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * 100, t = i / N;
    const h = 0.5 + 0.3 * Math.sin(t * 6.283 * f1 + p1) + 0.15 * Math.sin(t * 6.283 * f2 + p2) + 0.03 * Math.sin(t * 6.283 * f3 + p3);
    // the ridge settles towards the corners so they stay soft
    const edge = Math.min(1, Math.min(t, 1 - t) * 6);
    pts.push([x, amp * 0.55 * (1 - edge) + amp * (1 - Math.min(1, Math.max(0, h))) * edge]);
  }
  const corner = (cx: number, cy: number, rx: number, ry: number, from: number) => {
    for (let k = 0; k <= 5; k++) {
      const a = from + (k / 5) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
  };
  const [br, bl] = radii;
  // right edge, bottom-right corner, a faint swell along the base, bottom-left corner
  corner(100 - br, 100 - br * 1.2, br, br * 1.2, 0);
  for (let i = 1; i < 6; i++) { const t = i / 6; pts.push([100 - br - t * (100 - br - bl), 100 - Math.sin(t * Math.PI) * 1.2]); }
  corner(bl, 100 - bl * 1.2, bl, bl * 1.2, Math.PI / 2);
  return pts;
}

export function RidgeFrame({ shape, className = "", children }: { shape: Shape; className?: string; children: React.ReactNode }) {
  const clip = useMemo(() => {
    const pts = outline(shape).map(([x, y]) => `${x.toFixed(2)}% calc(100% - ${(100 - y).toFixed(2)}% * var(--r, 1))`);
    return `polygon(${pts.join(", ")})`;
  }, [shape]);
  return (
    <figure className={`rl-frame ${className}`} data-ridge="" style={{ clipPath: clip, WebkitClipPath: clip }}>
      {children}
    </figure>
  );
}
