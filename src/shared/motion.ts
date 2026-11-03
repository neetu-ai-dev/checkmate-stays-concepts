import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
export const useIsCompact = () => useMedia("(max-width: 760px)");
export const useFinePointer = () => useMedia("(hover: hover) and (pointer: fine)");

/** Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in lock-step. */
export function useLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, [enabled]);
}

/** Scrolls to an element through Lenis when it is running, natively otherwise. */
export function scrollToTarget(target: string | HTMLElement, opts: { immediate?: boolean; offset?: number } = {}) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
  if (lenis) lenis.scrollTo(el, { immediate: opts.immediate, offset: opts.offset ?? 0 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0), behavior: opts.immediate ? "auto" : "smooth" });
}

/** Fades/lifts every [data-reveal] element inside root as it enters the viewport. */
export function useReveal(root: React.RefObject<HTMLElement>, reduced: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", el);
    if (reduced) {
      gsap.set(items, { clearProps: "all", opacity: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      items.forEach((item) => {
        gsap.fromTo(
          item,
          { opacity: 0, y: Number(item.dataset.reveal) || 28 },
          { opacity: 1, y: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: item, start: "top 88%", once: true } },
        );
      });
    }, el);
    return () => ctx.revert();
  }, [root, reduced]);
}

/**
 * [data-clip] figures open from an inset frame as they arrive; [data-parallax] images drift
 * a few percent against the scroll (value = travel in %, default 8). One trigger per element,
 * transforms only, so it stays on the compositor.
 */
export function useImageMotion(root: React.RefObject<HTMLElement>, reduced: boolean, deps: unknown[] = []) {
  useEffect(() => {
    const el = root.current;
    if (!el || reduced) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-clip]", el).forEach((fig) => {
        const img = fig.querySelector("img");
        gsap.fromTo(fig, { clipPath: "inset(14% 10% 14% 10% round 6px)" }, {
          clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1.4, ease: "power3.out",
          scrollTrigger: { trigger: fig, start: "top 85%", once: true },
        });
        if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.8, ease: "power3.out", scrollTrigger: { trigger: fig, start: "top 85%", once: true } });
      });
      gsap.utils.toArray<HTMLElement>("[data-parallax]", el).forEach((img) => {
        const travel = Number(img.dataset.parallax) || 8;
        gsap.fromTo(img, { yPercent: -travel }, { yPercent: travel, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, reduced, ...deps]);
}
