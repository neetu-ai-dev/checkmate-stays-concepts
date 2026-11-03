import { useCallback, useEffect, useRef, useState } from "react";

/* Horizontal rails: gentle autoplay plus mouse drag, without ever taking the page.
   - advances one card at a time by scrolling the rail element itself (never the window);
   - pauses on hover, keyboard focus, drag, wheel/touch, off-screen, hidden tab, or the
     visitor's own pause button; direct interaction holds it for a while before resuming;
   - never autoplays under reduced motion;
   - mouse drag scrolls the rail, and a drag never fires the click underneath it. */

export function useAutoRail(ref: React.RefObject<HTMLElement>, { interval = 4800, reduced = false } = {}) {
  const [userPaused, setUserPaused] = useState(false);
  const userPausedRef = useRef(false);
  userPausedRef.current = userPaused;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false, hover = false, focus = false, dragging = false, holdUntil = 0;
    let startX = 0, startLeft = 0, moved = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true; moved = false; startX = e.clientX; startLeft = el.scrollLeft;
      el.classList.add("is-dragging");
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
      holdUntil = Date.now() + 8000;
    };
    const onClick = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
    const hold = () => { holdUntil = Date.now() + 8000; };
    const enter = () => { hover = true; };
    const leave = () => { hover = false; };
    const fin = () => { focus = true; };
    const fout = (e: FocusEvent) => { if (!el.contains(e.relatedTarget as Node)) focus = false; };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    el.addEventListener("wheel", hold, { passive: true });
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("keydown", hold);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("focusin", fin);
    el.addEventListener("focusout", fout);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && e.intersectionRatio > 0.35; }, { threshold: [0, 0.35, 0.6] });
    io.observe(el);

    const timer = reduced ? 0 : window.setInterval(() => {
      if (!visible || hover || focus || dragging || document.hidden || userPausedRef.current || Date.now() < holdUntil) return;
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const gap = parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap || "0") || 0;
      const step = first.getBoundingClientRect().width + gap;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, interval);

    return () => {
      window.clearInterval(timer);
      io.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("wheel", hold);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("keydown", hold);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("focusin", fin);
      el.removeEventListener("focusout", fout);
    };
  }, [ref, interval, reduced]);

  const step = useCallback((dir: 1 | -1) => {
    const el = ref.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    el.scrollBy({ left: dir * (first.getBoundingClientRect().width + 16), behavior: reduced ? "auto" : "smooth" });
  }, [ref, reduced]);

  return { paused: userPaused, togglePause: () => setUserPaused((p) => !p), step, autoplay: !reduced };
}
