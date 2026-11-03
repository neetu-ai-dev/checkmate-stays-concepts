import { useEffect, useRef } from "react";
import "./cursor-halo.css";

/* A halo that accompanies the native king cursor on fine pointers. The native cursor stays
   the precise pointer (and the fallback); the halo only adds context:
   - [data-cursor="image"]  → a telescope reticle
   - [data-cursor="card"]   → a soft lift ring
   - buttons and links      → a tight accent ring
   - text fields            → hidden, so it never sits over typing
   Position is written straight from each pointer event (no easing), so it cannot lag;
   only size and shape transition. It never takes pointer events. */

type Mode = "idle" | "image" | "card" | "action" | "text" | "hidden";

function modeFor(el: Element | null): Mode {
  if (!el) return "idle";
  if (el.closest("input, textarea, select, [contenteditable]")) return "text";
  if (el.closest("a, button, [role='button'], summary, label")) return "action";
  const tagged = el.closest<HTMLElement>("[data-cursor]");
  if (tagged) return (tagged.dataset.cursor as Mode) || "idle";
  return "idle";
}

export function CursorHalo() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const halo = ref.current;
    if (!halo || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let mode: Mode = "hidden";
    const set = (m: Mode) => { if (m !== mode) { mode = m; halo.dataset.mode = m; } };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      halo.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      set(modeFor(e.target as Element));
    };
    const leave = () => set("hidden");
    const down = () => halo.classList.add("is-down");
    const up = () => halo.classList.remove("is-down");
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <div ref={ref} className="cursor-halo" data-mode="hidden" aria-hidden="true">
      <span className="ch-ring" />
      <span className="ch-ticks" />
    </div>
  );
}

/** Gentle 3D tilt toward the pointer for [data-tilt] elements inside root (fine pointers only). */
export function useTilt(root: React.RefObject<HTMLElement>, enabled: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element).closest<HTMLElement>("[data-tilt]");
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--rx", `${(-y * 4).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${(x * 5).toFixed(2)}deg`);
      card.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
    };
    const onOut = (e: PointerEvent) => {
      const card = (e.target as Element).closest<HTMLElement>("[data-tilt]");
      if (card && !card.contains(e.relatedTarget as Node)) {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      }
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerout", onOut);
    };
  }, [root, enabled]);
}
