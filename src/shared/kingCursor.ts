import { useEffect } from "react";

/* The evolving chess cursor. Page progress walks it through the pieces —
   pawn → knight → bishop → rook → queen — and scrolling back walks it home again.

   It stays the browser's native cursor (no DOM follower), so it is as precise and lag-free
   as the system arrow. Smoothness comes from cross-fade frames between pieces: progress is
   quantised to sixths of a stage (25 frames) and each frame is built once and cached.
   Every piece puts its top tip at (12, 1), so the click point never moves. Fine pointers
   only; touch never sees it, text fields keep the I-beam, and `auto`/`pointer` remain the
   fallback if an image cursor can't be shown. */

const BASE = "M4.6 23.8h14.8c.9 0 1.4.6 1.4 1.5v2.9H3.2v-2.9c0-.9.5-1.5 1.4-1.5z";
const PIECES = [
  // pawn
  `M12 1.2a4.7 4.7 0 1 1 0 9.4a4.7 4.7 0 1 1 0-9.4zM7.4 11h9.2v1.8H7.4zM9.2 12.8h5.6c.2 4 1.4 7.4 3 10.6H6.2c1.6-3.2 2.8-6.6 3-10.6z${BASE}`,
  // knight
  `M12 1l1.7 3.1c3.4 1 5.7 4.2 6.1 8.3.4 3.8-.6 7.4-2 10.4H7.2c.4-3 1.8-5.2 3.8-7-1.6-.2-3.2.4-4.6 1.2-1.6.9-3.2-.4-2.6-2.2 1-3 3.4-4.8 5-7.4.8-1.4 1.4-3.4 3.2-4.4z${BASE}`,
  // bishop
  `M12 1a1.7 1.7 0 1 1 0 3.4a1.7 1.7 0 1 1 0-3.4zM12 4.6c-3 2.4-4.6 5.2-4 8.4.3 1.6 1.4 2.6 1.4 2.6h5.2s1.1-1 1.4-2.6c.4-2-.2-3.8-1.2-5.4l-2.6 3.8-1-.7 2.6-4c-.5-.8-1.1-1.4-1.8-2.1zM8.4 15.6h7.2v1.6H8.4zM9.4 17.2h5.2c-.1 2.6.9 4.6 2.8 6.6H6.6c1.9-2 2.9-4 2.8-6.6z${BASE}`,
  // rook
  `M5.4 1h2.8v2.6h2.4V1h2.8v2.6h2.4V1h2.8v5.4l-2.2 1.8v9.6l2.6 2.6v2.4H5v-2.4l2.6-2.6V8.2L5.4 6.4z${BASE}`,
  // queen
  `M12 .8a1.4 1.4 0 1 1 0 2.8a1.4 1.4 0 1 1 0-2.8zM4.2 4.8l3.1 6.4 1.6-6.6 3.1 6.2 3.1-6.2 1.6 6.6 3.1-6.4-1.9 9H6.1zM6.4 14h11.2v1.8H6.4zM8.2 15.8h7.6c0 3 1 5.6 2.8 8H5.4c1.8-2.4 2.8-5 2.8-8z${BASE}`,
];
export const CURSOR_STAGES = ["pawn", "knight", "bishop", "rook", "queen"] as const;
const STEPS = 6;

export type KingCursorTheme = { fill: string; stroke: string; accent: string };

function frameSvg(q: number, fill: string, stroke: string, glint?: string) {
  const i = Math.min(PIECES.length - 1, Math.floor(q));
  const f = q - i;
  const piece = (idx: number, opacity: number, scale: number) =>
    opacity <= 0.001 ? "" : `<g opacity='${opacity.toFixed(2)}' transform='translate(12 16) scale(${scale.toFixed(3)}) translate(-12 -16)'><path fill-rule='evenodd' d='${PIECES[idx]}'/></g>`;
  const body = f < 0.001 || i === PIECES.length - 1
    ? piece(i, 1, 1)
    : piece(i, 1 - f, 1 - f * 0.18) + piece(i + 1, f, 0.82 + f * 0.18);
  const dot = glint ? `<circle cx='12' cy='1.6' r='1.6' fill='${glint}'/>` : "";
  return `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='30' viewBox='0 0 24 30'><g fill='${fill}' stroke='${stroke}' stroke-width='1.1' stroke-linejoin='round'>${body}</g>${dot}</svg>`;
}

const cache = new Map<string, { base: string; pointer: string }>();
function cursorsFor(q: number, theme: KingCursorTheme) {
  const key = `${q}|${theme.fill}|${theme.stroke}|${theme.accent}`;
  let c = cache.get(key);
  if (!c) {
    const url = (svg: string, fallback: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 1, ${fallback}`;
    c = {
      base: url(frameSvg(q, theme.fill, theme.stroke), "auto"),
      pointer: url(frameSvg(q, theme.accent, theme.stroke, "#ffffff"), "pointer"),
    };
    cache.set(key, c);
  }
  return c;
}

/** Page progress (0–1) → cursor stage (0–4), quantised to cross-fade frames. */
export function cursorStage(progress: number) {
  return Math.round(Math.min(1, Math.max(0, progress)) * 4 * STEPS) / STEPS;
}

/** CSS for documents whose stylesheet the app doesn't own (the Highlands hero frame). */
export function kingCursorCss(theme: KingCursorTheme, q = 0) {
  const c = cursorsFor(q, theme);
  return `@media (hover:hover) and (pointer:fine){
html,body,body *{cursor:${c.base} !important}
a,button,[role=button],label,summary,[data-dock],a *,button *{cursor:${c.pointer} !important}
input,textarea,[contenteditable]{cursor:text !important}}`;
}

export function useKingCursor(theme: KingCursorTheme, onStage?: (q: number) => void) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("king-cursor");
    let last = -1;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const q = cursorStage(max > 0 ? window.scrollY / max : 0);
      if (q === last) return;
      last = q;
      const c = cursorsFor(q, theme);
      root.style.setProperty("--king", c.base);
      root.style.setProperty("--king-pointer", c.pointer);
      root.dataset.cursorStage = CURSOR_STAGES[Math.round(q)];
      onStage?.(q);
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      cancelAnimationFrame(raf);
      root.classList.remove("king-cursor");
      root.style.removeProperty("--king");
      root.style.removeProperty("--king-pointer");
      delete root.dataset.cursorStage;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.fill, theme.stroke, theme.accent]);
}
