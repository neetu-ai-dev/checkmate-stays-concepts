import { memo, useEffect, useMemo, useRef, useState } from "react";
import { BookingWidget } from "../../shared/BookingWidget";
import { RetreatPanel } from "../../shared/RetreatPanel";
import { DIARY, EXPERIENCES, GUEST_WORDS, INTRO, SITE, SUITE_FEATURES, SUITES, SUSTAINABILITY } from "../../shared/content";
import { useKingCursor } from "../../shared/kingCursor";
import { ScrollTrigger, gsap, scrollToTarget, useIsCompact, useImageMotion, useLenis, useReducedMotion, useReveal } from "../../shared/motion";
import { ConceptSwitcher, ContactBlock, IllustrativeNote, Stock, Wordmark } from "../../shared/ui";
import { useDocumentTitle, useFonts } from "../../shared/useFonts";
import { RidgeWorld } from "./ridgeWorld";
import { FeatureShowcase } from "../../shared/FeatureShowcase";
import { RidgeFrame, type Shape } from "./RidgeFrame";
import PerspectiveTunnelHero, { type TunnelItem } from "@/components/ui/perspective-tunnel-hero";
import { useScroll, type MotionValue } from "framer-motion";
import "./ridgelight.css";

const exp = (id: string) => EXPERIENCES.find((e) => e.id === id)!;

/* one family of ridgeline frames: each has its own ridge and its own pair of base corners */
const FRAMES: Record<string, Shape> = {
  living: { seed: 3, amp: 10, radii: [14, 4] },
  window: { seed: 8, amp: 13, radii: [5, 18] },
  balcony: { seed: 14, amp: 9, radii: [20, 9] },
  diary: { seed: 33, amp: 9, radii: [10, 22] },
};

const CHAPTERS = [
  { href: "#house", n: "01", title: "The House", alt: "घर", line: "Two suites, each with two bedrooms and a wraparound balcony." },
  { href: "#oak", n: "02", title: "The Oak", alt: "बाग़", line: "A garden shaded by a 200-year-old oak." },
  { href: "#after-dark", n: "03", title: "After Dark", alt: "रात", line: "Bonfires, board games and clear winter skies." },
  { href: "#diary", n: "04", title: "The Diary", alt: "रसोई", line: "Garhwali and Indian cuisine, reservation-only." },
];

/* After Dark flies through the evening: licensed stock (illustrative), titled from the
   verified experiences. */
const stock = (name: string) => `/stock/${name}-sm.webp`;
const AFTER_DARK: TunnelItem[] = [
  { src: stock("peaks-night-stars"), title: "Stargazing", alt: "Snow peaks under a starry sky" },
  { src: stock("noir-bonfire"), title: "Bonfire", alt: "A campfire in the mountains at night" },
  { src: stock("rail-board-games"), title: "Board games", alt: "A board game laid out on a wooden table" },
  { src: stock("night-milkyway-peaks"), title: "October to February", alt: "The Milky Way over snow peaks" },
  { src: stock("hearth"), title: "By the fire", alt: "Flames in a fireplace" },
  { src: stock("night-bonfire"), title: "Barbecue", alt: "A campfire under a starry sky" },
  { src: stock("peak-stars"), title: "Orion & Taurus", alt: "Stars over a snow-covered peak" },
  { src: stock("window-glow"), title: "Evenings in", alt: "A candle lit by a cabin window" },
  { src: stock("noir-thali"), title: "The Diary", alt: "A spread of Indian dishes" },
];

/** The After Dark tunnel, memoised: the header clock re-renders the page as the hour changes
    while scrolling, and the flight itself never needs to re-render (it runs on motion values). */
const AfterDarkTunnel = memo(function AfterDarkTunnel({ progress, compact }: { progress?: MotionValue<number>; compact: boolean }) {
  return (
    <PerspectiveTunnelHero
      className="rl-tunnel-hero"
      items={compact ? AFTER_DARK.slice(0, 6) : AFTER_DARK}
      progress={progress}
      eyebrow="Evenings at Checkmate"
      titleAs="h2"
      titleId="rl-dark-h"
      title={<>When the windows glow,<br /><em>the sky opens.</em></>}
      description="Clear skies from October to February, a bonfire in the garden, and board games brought to your living room."
      prompt="Scroll into the evening"
    />
  );
});

/** A row of pine silhouettes for a section edge, drawn once as SVG. */
function PineEdge({ side, seed }: { side: "left" | "right"; seed: number }) {
  const d = useMemo(() => {
    let s = seed;
    const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    let path = "";
    for (let i = 0; i < 9; i++) {
      const x = 20 + i * 44 + r() * 20;
      const h = 150 + r() * 230 - i * 14;
      const w = h * 0.26;
      const base = 400;
      const tiers = 6;
      path += `M${x} ${base - h}`;
      for (let t = 1; t <= tiers; t++) {
        const y = base - h + (h * 0.86 * t) / tiers;
        const span = (w * t) / tiers + 6;
        path += `L${x + span} ${y}L${x + span * 0.45} ${y - 4}`;
      }
      for (let t = tiers; t >= 1; t--) {
        const y = base - h + (h * 0.86 * t) / tiers;
        const span = (w * t) / tiers + 6;
        path += `L${x - span * 0.45} ${y - 4}L${x - span} ${y}`;
      }
      path += `Z M${x - 4} ${base - h * 0.14}h8V${base}h-8Z `;
    }
    return path;
  }, [seed]);
  return (
    <svg className={`rl-pines rl-pines--${side}`} viewBox="0 0 420 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Page progress → a clock from 06:00 to midnight, and the phase of the day. */
function hourOf(p: number) {
  const minutes = 6 * 60 + p * 18 * 60;
  const h = Math.floor(minutes / 60) % 24, m = Math.floor((minutes % 60) / 10) * 10;
  const phase = p < 0.12 ? "Morning" : p < 0.3 ? "Midday" : p < 0.48 ? "Afternoon" : p < 0.62 ? "Sunset" : p < 0.76 ? "Dusk" : "Night";
  return { label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, phase };
}

function supportsWebGL() {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

export default function RidgelightConcept() {
  useFonts("family=Onest:wght@300;400;500&family=Tiro+Devanagari+Hindi&display=swap&family=Instrument+Serif:ital@1");
  useDocumentTitle("Checkmate Stays — Concept 3 · Ridgelight");
  useKingCursor({ fill: "#e9efec", stroke: "#071012", accent: "#ff9a4a" });
  const reduced = useReducedMotion();
  const compact = useIsCompact();
  useLenis(!reduced);
  const root = useRef<HTMLDivElement>(null);
  const worldHost = useRef<HTMLDivElement>(null);
  const world = useRef<RidgeWorld>();
  const [webgl] = useState(supportsWebGL);
  const [active, setActive] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [clock, setClock] = useState(() => hourOf(0));
  // the After Dark tunnel flies with page scroll through its own tall track
  const tunnelTrack = useRef<HTMLDivElement>(null);
  const { scrollYProgress: tunnelProgress } = useScroll({ target: tunnelTrack, offset: ["start start", "end end"] });
  useReveal(root, reduced);
  useImageMotion(root, reduced);

  useEffect(() => {
    const host = worldHost.current;
    if (!host || !webgl) return;
    const w = new RidgeWorld(host, { compact, reduced });
    world.current = w;
    return () => { w.dispose(); world.current = undefined; };
  }, [compact, reduced, webgl]);

  // each chapter hands the camera a waypoint and raises its foreground
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // page progress sets the hour of the world's day
    let raf = 0;
    const tick = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      world.current?.setTimeOfDay(p);
      el.style.setProperty("--night", String(Math.min(1, Math.max(0, (p - 0.5) / 0.3))));
      // past the opening, the world softens behind the content (and sharpens again on the way back)
      const soften = Math.min(1, Math.max(0, (window.scrollY - window.innerHeight * 0.12) / (window.innerHeight * 0.7)));
      el.style.setProperty("--soften", soften.toFixed(3));
      setClock((c) => { const n = hourOf(p); return n.label === c.label ? c : n; });
    };
    const onScroll = () => { setScrolled(window.scrollY > 40); if (!raf) raf = requestAnimationFrame(tick); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const triggers = gsap.utils.toArray<HTMLElement>("[data-cam]", el).map((sec) =>
      ScrollTrigger.create({
        trigger: sec, start: "top 55%", end: "bottom 55%",
        onToggle: (self) => {
          sec.classList.toggle("is-active", self.isActive);
          if (self.isActive) {
            const i = Number(sec.dataset.cam);
            world.current?.setWaypoint(i);
            setActive(i);
          }
        },
      }),
    );
    let ctx: gsap.Context | undefined;
    if (!reduced) {
      ctx = gsap.context(() => {
        gsap.from(".rl-hero h1 .rl-l", { yPercent: 115, duration: 1.3, ease: "power4.out", stagger: 0.1, delay: 0.2 });
        gsap.from(".rl-hero-fade", { opacity: 0, y: 20, duration: 1.2, ease: "power3.out", stagger: 0.08, delay: 0.6 });
        // each frame's ridge rises to uncover its photograph, which settles back as it does
        for (const fig of gsap.utils.toArray<HTMLElement>("[data-ridge]")) {
          const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: "top 92%", end: "top 42%", scrub: 0.8 } });
          tl.fromTo(fig, { "--r": 0.04 }, { "--r": 1, ease: "power2.out" }, 0)
            .fromTo(fig.querySelector("img"), { scale: 1.16, yPercent: 4 }, { scale: 1.04, yPercent: 0, ease: "power2.out" }, 0);
        }
        // the booking panel arrives as its chapter scrolls in
        gsap.fromTo(".rl-book-panel", { opacity: 0, y: 60, clipPath: "inset(12% 0% 0% 0% round 16px)" }, {
          opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 16px)", ease: "none",
          scrollTrigger: { trigger: ".rl-plan", start: "top 85%", end: "top 35%", scrub: 0.6 },
        });
      }, el);
    }
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); triggers.forEach((t) => t.kill()); ctx?.revert(); };
  }, [reduced]);

  const go = (href: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToTarget(href, { offset: -10 }); };

  return (
    <div className="rl" ref={root}>
      <a className="skip-link" href="#book">Skip to booking</a>
      <div className="rl-world" ref={worldHost} aria-hidden="true">
        {!webgl && <Stock name="aframe-lodge" alt="" eager />}
      </div>
      <div className="rl-vignette" aria-hidden="true" />

      <header className={`rl-nav ${scrolled ? "is-scrolled" : ""}`}>
        <a className="rl-brand" href="#top" onClick={go("#top")} aria-label="Checkmate Stays — top">
          <Wordmark />
          <span className="rl-brand-tx">Charleville · Mussoorie</span>
        </a>
        <nav className="rl-links" aria-label="Chapters">
          {CHAPTERS.map((c, i) => (
            <a key={c.href} href={c.href} onClick={go(c.href)} aria-current={active === i + 1 ? "true" : undefined}>
              <span>{c.title}</span><span className="rl-alt" lang="hi">{c.alt}</span>
            </a>
          ))}
        </nav>
        <p className="rl-clock" title="The scene follows a day as you scroll"><span className={`rl-clock-dot ${clock.phase === "Night" || clock.phase === "Dusk" ? "is-moon" : ""}`} aria-hidden="true" />{clock.phase} · {clock.label}</p>
        <button type="button" className="rl-book" onClick={() => scrollToTarget("#book", { offset: -40 })}>Reserve</button>
      </header>

      <section id="top" className="rl-hero" data-cam="0" aria-labelledby="rl-hero-h">
        <div className="rl-hero-top">
          <p className="rl-eyebrow rl-hero-fade"><span className="rl-dot" /> Morning on the ridge</p>
          <h1 id="rl-hero-h">
            <span className="rl-mask"><span className="rl-l">A light left on</span></span>
            <span className="rl-mask"><span className="rl-l">at the edge of</span></span>
            <span className="rl-mask"><span className="rl-l"><em>the Himalayas.</em></span></span>
          </h1>
          <p className="rl-hero-sub rl-hero-fade">{SITE.kind}. Two suites beneath a 200-year-old oak, the snow-capped range on the horizon.</p>
        </div>
        <p className="rl-cue rl-hero-fade" aria-hidden="true"><span />Scroll from morning into night</p>
        <p className="rl-side" lang="hi" aria-hidden="true">पहाड़ों की रानी</p>
        <p className="rl-illus">Illustrative 3D scene & imagery</p>
      </section>

      <main>
        <section id="book" className="rl-sec rl-plan" data-cam="0" aria-labelledby="rl-book-h">
          <div className="rl-book-copy">
            <div className="rl-sec-head" data-reveal><span><b>00</b> — Plan your stay</span><span className="rl-rule" /><span lang="hi">स्वागत</span></div>
            <h2 id="rl-book-h" data-reveal>Choose your days on the ridge.</h2>
            <p className="rl-lead" data-reveal>Two suites, each with two bedrooms and a private L-shaped balcony. Live rates open in our booking engine.</p>
          </div>
          <div className="rl-book-panel">
            <RetreatPanel title={["Checkmate Stays", "Reserve your nights"]} cta="Check availability" />
          </div>
        </section>

        <section id="house" className="rl-sec" data-cam="1" aria-labelledby="rl-house-h">
          <PineEdge side="left" seed={5} />
          <div className="rl-sec-head" data-reveal><span><b>01</b> — The House</span><span className="rl-rule" /><span lang="hi">घर</span></div>
          <div className="rl-grid">
            <h2 id="rl-house-h" data-reveal>Two suites, a wraparound balcony, and the range at the rail.</h2>
            <div className="rl-copy">
              {SUITES.map((s) => (
                <article key={s.id} className="rl-panel" data-reveal>
                  <h3>{s.name}</h3>
                  <p>{s.short}</p>
                  <ul>{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
          <div className="rl-gallery">
            <RidgeFrame shape={FRAMES.living} className="rl-g-living">
              <Stock name="green-suite" alt="A timber living room with a wall of glass onto green hills" sizes="(max-width: 900px) 100vw, 58vw" />
            </RidgeFrame>
            <RidgeFrame shape={FRAMES.window} className="rl-g-window">
              <Stock name="noir-suite-living" alt="Snow peaks framed by a window beside a lamp" sizes="(max-width: 900px) 60vw, 30vw" />
            </RidgeFrame>
            <RidgeFrame shape={FRAMES.balcony} className="rl-g-balcony">
              <Stock name="house-balcony" alt="A timber porch looking out over pine forest" sizes="(max-width: 900px) 50vw, 24vw" />
            </RidgeFrame>
            <p className="rl-g-note" data-reveal><b>Inside the suites</b>{SUITE_FEATURES[2].text} {SUITE_FEATURES[1].text}</p>
          </div>
          <FeatureShowcase variant="split" className="rl-fs" reduced={reduced} />
        </section>

        <section id="oak" className="rl-sec rl-sec--narrow" data-cam="2" aria-labelledby="rl-oak-h">
          <PineEdge side="right" seed={11} />
          <div className="rl-sec-head" data-reveal><span><b>02</b> — The Oak</span><span className="rl-rule" /><span lang="hi">बाग़</span></div>
          <h2 id="rl-oak-h" data-reveal>{INTRO.pauseTitle}.</h2>
          <p className="rl-lead" data-reveal>{INTRO.oak}</p>
          <p className="rl-body" data-reveal>{INTRO.pause}</p>
        </section>

        <section id="after-dark" className={`rl-sec rl-tunnel ${reduced ? "is-static" : ""}`} data-cam="3" aria-labelledby="rl-dark-h">
          <div className="rl-tunnel-track" ref={tunnelTrack}>
            <div className="rl-tunnel-stage">
              <div className="rl-sec-head rl-tunnel-head"><span><b>03</b> — After Dark</span><span className="rl-rule" /><span lang="hi">रात</span></div>
              <AfterDarkTunnel progress={reduced ? undefined : tunnelProgress} compact={compact} />
            </div>
          </div>
          <div className="rl-dark-notes">
            <ul>
              {(["stargazing", "bonfire", "board-games"] as const).map((id) => (
                <li key={id} data-reveal><h3>{exp(id).title}</h3><p>{exp(id).text}</p></li>
              ))}
            </ul>
            <p className="rl-nearby" data-reveal>
              <span>By day</span>
              {EXPERIENCES.filter((e) => e.kind === "nearby").map((e) => <span key={e.id}>{e.title}</span>)}
            </p>
          </div>
        </section>

        <section id="diary" className="rl-sec" data-cam="4" aria-labelledby="rl-diary-h">
          <PineEdge side="right" seed={29} />
          <div className="rl-sec-head" data-reveal><span><b>04</b> — The Diary</span><span className="rl-rule" /><span lang="hi">रसोई</span></div>
          <div className="rl-diary">
            <RidgeFrame shape={FRAMES.diary} className="rl-diary-frame">
              <Stock name="window-glow" alt="A candle lit on a table by a cabin window" sizes="(max-width: 900px) 100vw, 45vw" />
            </RidgeFrame>
            <div>
              <h2 id="rl-diary-h" data-reveal>{DIARY.title}</h2>
              <p className="rl-lead" data-reveal>{DIARY.subtitle}.</p>
              <ol className="rl-dishes">{DIARY.dishes.map((d, i) => <li key={d.name} data-reveal><span>{String(i + 1).padStart(2, "0")}</span><b>{d.name}</b><i>{d.text}</i></li>)}</ol>
              <a className="rl-ghost-btn" href={`tel:${SITE.diaryPhone.replace(/\s/g, "")}`}>{DIARY.reservation} · {SITE.diaryPhone}</a>
            </div>
          </div>
        </section>

        <section className="rl-sec rl-care" aria-labelledby="rl-care-h">
          <h2 id="rl-care-h" className="rl-small-h" data-reveal>Built with a deep respect for the Himalayas</h2>
          <ul>{SUSTAINABILITY.map((s) => <li key={s.title} data-reveal><b>{s.title}</b><span>{s.text}</span></li>)}</ul>
          <div className="rl-words">
            {GUEST_WORDS.map((g) => <figure key={g.name} className="rl-panel" data-reveal><blockquote>“{g.quote}”</blockquote><figcaption>{g.name}</figcaption></figure>)}
          </div>
        </section>

        <section id="connect" className="rl-sec rl-fin" data-cam="5" aria-labelledby="rl-fin-h">
          <h2 id="rl-fin-h" data-reveal>Afterglow</h2>
          <p className="rl-lead" data-reveal>{INTRO.retreat}</p>
          <BookingWidget layout="bar" className="rl-bw" submitLabel="Check availability" />
          <div className="rl-fin-meta">
            <ContactBlock />
            <ul>{SITE.directions.map((d) => <li key={d.from}><b>{d.time}</b> · {d.distance} from {d.from}</li>)}</ul>
          </div>
        </section>
      </main>

      <footer className="rl-foot">
        <Wordmark className="rl-foot-mark" />
        <p>{SITE.tagline}</p>
        <p><a href={SITE.policies.privacy}>Privacy policy</a> · <a href={SITE.policies.refund}>Refund & cancellation</a> · <a href={SITE.instagram}>{SITE.instagramHandle}</a></p>
        <IllustrativeNote />
      </footer>

      <div className="mobile-book rl-mobile-book" data-hidden={!scrolled}>
        <span>Charleville · Mussoorie</span>
        <button type="button" onClick={() => scrollToTarget("#connect", { offset: 0 })}>Reserve</button>
      </div>
      <ConceptSwitcher current="/concepts/ridgelight" />
    </div>
  );
}
