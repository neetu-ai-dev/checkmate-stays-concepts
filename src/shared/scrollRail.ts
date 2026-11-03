import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, type ScrollTrigger } from "./motion";

/* A horizontal sequence driven by vertical scroll.

   Pinned (wide screens, motion allowed): the section holds in view while page scroll moves
   the track sideways, one pixel of track per pixel of scroll, then releases into the next
   section. Nothing moves on a timer, so the visitor is always in control, and scrolling back
   up plays it in reverse.

   Native (phones, reduced motion): the track is an ordinary swipeable, snapping row.

   Either way it reports the item in focus and can bring any item into focus, for tabs.
   Focus is read at a probe that slides from the view's left edge (start of travel) to its
   right edge (end of travel), so every item, the last ones too, gets its turn even though
   they can never reach the leading edge. Items are the track's direct children. */

type Metrics = { travel: number; view: number; starts: number[]; widths: number[] };

function measure(el: HTMLElement): Metrics {
  const items = Array.from(el.children) as HTMLElement[];
  const first = items[0]?.offsetLeft ?? 0;
  const view = el.parentElement?.clientWidth ?? window.innerWidth;
  const last = items.at(-1);
  const cs = getComputedStyle(el);
  // travel until the last item, plus the track's end padding, meets the right edge
  const end = last ? last.offsetLeft - first + last.offsetWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) : 0;
  return { travel: Math.max(0, end - view), view, starts: items.map((it) => it.offsetLeft - first), widths: items.map((it) => it.offsetWidth) };
}

/** The item under the probe once the track has moved x of its travel. */
function focusAt(m: Metrics, x: number) {
  const probe = x + (m.travel > 0 ? x / m.travel : 0) * m.view;
  let i = 0;
  m.starts.forEach((s, k) => { if (s <= probe) i = k; });
  return i;
}

/** How far the track must move for item i's centre to sit under the probe. */
function travelFor(m: Metrics, i: number) {
  const centre = m.starts[i] + m.widths[i] / 2;
  return Math.min(m.travel, Math.max(0, (centre / (m.travel + m.view)) * m.travel));
}

export function useScrollRail(section: React.RefObject<HTMLElement>, track: React.RefObject<HTMLElement>, { pinned }: { pinned: boolean }) {
  const [active, setActive] = useState(0);
  const trigger = useRef<ScrollTrigger>();

  useEffect(() => {
    const sec = section.current, el = track.current;
    if (!sec || !el) return;
    if (!pinned) {
      const onScroll = () => setActive(focusAt({ ...measure(el), travel: el.scrollWidth - el.clientWidth, view: el.clientWidth }, el.scrollLeft));
      el.addEventListener("scroll", onScroll, { passive: true });
      return () => el.removeEventListener("scroll", onScroll);
    }
    let m = measure(el);
    const ctx = gsap.context(() => {
      const tween = gsap.to(el, {
        x: () => -m.travel,
        ease: "none",
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: () => `+=${m.travel}`,
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefreshInit: () => { m = measure(el); },
          onUpdate: (self) => setActive(focusAt(m, self.progress * m.travel)),
        },
      });
      trigger.current = tween.scrollTrigger;
    }, sec);
    return () => { ctx.revert(); trigger.current = undefined; };
  }, [section, track, pinned]);

  /** Bring item i into focus: by scrolling the page when pinned, the row when not. */
  const goTo = useCallback((i: number) => {
    const el = track.current;
    if (!el || !el.children[i]) return;
    const st = trigger.current;
    if (st) {
      const y = st.start + travelFor(measure(el), i);
      const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o?: object) => void } }).__lenis;
      if (lenis) lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      el.scrollTo({ left: travelFor({ ...measure(el), travel: el.scrollWidth - el.clientWidth, view: el.clientWidth }, i), behavior: "smooth" });
    }
  }, [track]);

  return { active, goTo };
}
