import { useEffect, useRef, useState } from "react";
import { BookingWidget } from "../../shared/BookingWidget";
import { RetreatPanel } from "../../shared/RetreatPanel";
import { FeatureShowcase } from "../../shared/FeatureShowcase";
import { DIARY, EXPERIENCES, GUEST_WORDS, INTRO, NAV, SITE, SUITES, SUSTAINABILITY } from "../../shared/content";
import { useKingCursor } from "../../shared/kingCursor";
import { ScrollTrigger, gsap, scrollToTarget, useIsCompact, useImageMotion, useLenis, useReducedMotion, useReveal } from "../../shared/motion";
import { ConceptSwitcher, ContactBlock, IllustrativeNote, Stock, Wordmark, type StockKey } from "../../shared/ui";
import { useDocumentTitle, useFonts } from "../../shared/useFonts";
import { openBooking } from "../../shared/booking";
import { ChessScene, ENTRY, PHASE, START, type SceneAssets } from "./chessScene";
import "./checkmate.css";

const seg = (p: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (p - a) / (b - a)));

const SQUARES: ({ img: StockKey; alt: string } | { exp: string })[] = [
  { exp: "stargazing" }, { img: "peak-stars", alt: "Stars over a snow peak at night" }, { exp: "bonfire" }, { img: "noir-bonfire", alt: "A campfire beneath a starry sky" },
  { img: "noir-thali", alt: "A spread of Indian dishes" }, { exp: "diary" }, { img: "mist-pines", alt: "Pine forest in mist" }, { exp: "dalai-hills" },
  { exp: "board-games" }, { img: "great-oak", alt: "A great oak spreading over a garden" }, { exp: "landour" }, { img: "noir-winterline", alt: "Himalayan peaks at dusk" },
];

export default function CheckmateConcept() {
  useFonts("family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400");
  useDocumentTitle("Checkmate Stays — Concept 4 · Checkmate");
  useKingCursor({ fill: "#f3ece0", stroke: "#0b0a0c", accent: "#c9a35c" });
  const reduced = useReducedMotion();
  const compact = useIsCompact();
  useLenis(!reduced);

  const root = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<gsap.core.Tween>();
  const [pastIntro, setPastIntro] = useState(false);
  const [entered, setEntered] = useState(reduced);
  useReveal(root, reduced);
  useImageMotion(root, reduced);

  useEffect(() => {
    const cv = canvas.current, section = intro.current, ui = stage.current;
    if (!cv || !section || !ui) return;

    const assets: SceneAssets = {};
    const scene = new ChessScene(cv, assets, { compact });
    // scroll plays the scene from the mating net (START) to the hero
    let progress = reduced ? 1 : START;
    let entry = 1;
    let raf = 0;
    const paint = () => {
      raf = 0;
      // during the entrance the camera finishes easing back from the king onto the board
      const p = progress <= START + 0.0001 ? START - (START - ENTRY) * (1 - entry) : progress;
      scene.render(p);
      applyOverlays(ui, p, entry);
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
    const size = () => {
      const r = cv.getBoundingClientRect();
      scene.resize(r.width, r.height);
      queue();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);

    const photo = new Image();
    photo.decoding = "async";
    photo.src = compact ? "/stock/noir-retreat-sm.webp" : "/stock/noir-retreat-lg.webp";
    photo.onload = () => { assets.photo = photo; queue(); };

    let st: ScrollTrigger | undefined;
    let tween: gsap.core.Tween | undefined;
    let entrance: gsap.core.Tween | undefined;
    if (!reduced) {
      const state = { p: START };
      tween = gsap.to(state, {
        p: 1,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: compact ? 0.4 : 0.7 },
        onUpdate: () => { progress = state.p; queue(); },
      });
      scrubRef.current = tween;
      st = ScrollTrigger.create({ trigger: section, start: "bottom 45%", endTrigger: document.documentElement, end: "bottom bottom", onToggle: (self) => setPastIntro(self.isActive) });
      // a brief entrance, played once: the board fades up as the camera settles onto the mate
      if (window.scrollY < 4) {
        const e = { t: 0 };
        entry = 0;
        entrance = gsap.to(e, { t: 1, duration: 1.9, delay: 0.15, ease: "power3.out", onUpdate: () => { entry = e.t; queue(); } });
      }
      setEntered(true);
    }

    return () => {
      ro.disconnect();
      tween?.scrollTrigger?.kill();
      tween?.kill();
      entrance?.kill();
      st?.kill();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced, compact]);

  const skipIntro = () => {
    const section = intro.current;
    if (!section) return;
    const y = section.offsetTop + section.offsetHeight - window.innerHeight;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo({ top: y });
    // jump, don't fast-forward: finish the scrub smoothing at the new scroll position
    ScrollTrigger.update();
    scrubRef.current?.scrollTrigger?.getTween()?.progress(1);
    // reveal now (the repaint lands a frame later) so focus can land in the hero
    const hero = heroRef.current;
    if (hero) Object.assign(hero.style, { visibility: "visible", opacity: "1", transform: "none" });
    hero?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  };

  const toBooking = () => scrollToTarget("#book", { offset: -120 });
  const go = (href: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToTarget(href, { offset: -72 }); };
  const lines = (...ls: React.ReactNode[]) => ls.map((l, i) => <span key={i} className="cm-line"><span>{l}</span></span>);

  return (
    <div className="cm" ref={root}>
      <a className="skip-link" href="#cm-main">Skip to content</a>
      <header className={`cm-header ${pastIntro ? "is-scrolled" : ""}`}>
        <a href="#top" className="cm-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }); }} aria-label="Checkmate Stays — back to top">
          <Wordmark />
        </a>
        <nav className="cm-nav" aria-label="Primary">
          {NAV.map((n) => <a key={n.href} href={n.href} onClick={go(n.href)}>{n.label}</a>)}
        </nav>
        <div className="cm-header-actions">
          {!reduced && !pastIntro && <button type="button" className="cm-skip" onClick={skipIntro}>Skip intro</button>}
          <button type="button" className="cm-book" onClick={toBooking}>Book now</button>
        </div>
      </header>

      <section id="top" ref={intro} className={`cm-intro ${reduced ? "is-static" : ""}`} aria-label="Introduction">
        <div className="cm-stage" ref={stage}>
          <canvas ref={canvas} className={`cm-canvas ${entered ? "is-in" : ""}`} aria-hidden="true" />
          <div className="cm-overlays">
            <div className="cm-ov cm-ov--open" data-ov="open">
              <p className="cm-eyebrow">Charleville · Mussoorie</p>
              <p className="cm-open-line">An endgame in the hills</p>
              <p className="cm-scrollcue" aria-hidden="true"><span />Scroll to play the final move</p>
            </div>
            <div className="cm-ov cm-mate" data-ov="mate" aria-hidden="true">
              <p className="cm-mate-word">{"Checkmate".split("").map((c, i) => <span key={i} style={{ ["--i" as string]: i }}>{c}</span>)}</p>
              <p className="cm-mate-note">… Qg7#</p>
            </div>
          </div>
          <div className="cm-stage-ui">
            <div className="cm-hero-copy" ref={heroRef} data-ov="hero">
              <p className="cm-eyebrow">{SITE.kind}</p>
              <h1 tabIndex={-1}>Your key to<br /><em>redefined luxury</em></h1>
              <p className="cm-hero-sub">Two suites beneath a 200-year-old oak in Charleville, facing the snow-capped Himalayas.</p>
            </div>
          </div>
          <p className="cm-hero-tag" data-ov="tag">Illustrative imagery</p>
        </div>
      </section>

      <main id="cm-main">
        <section className="cm-opening" aria-labelledby="cm-opening-h">
          <p className="cm-index" data-reveal>01 — The opening</p>
          <h2 id="cm-opening-h" className="cm-split">{lines("A space to pause,", <em>reflect & reconnect</em>)}</h2>
          <div className="cm-opening-grid">
            <figure className="cm-opening-fig" data-clip><Stock name="lake-lodge-lights" alt="A lodge glowing beside a still lake" parallax={6} sizes="(max-width: 900px) 100vw, 50vw" /></figure>
            <div className="cm-opening-cols">
              <p data-reveal>{INTRO.lead}</p>
              <p data-reveal>{INTRO.oak}</p>
            </div>
          </div>
          <div className="cm-reserve">
            <div className="cm-reserve-copy" data-reveal>
              <p className="cm-your-move">Your move.</p>
              <h3>Choose your days in Charleville.</h3>
              <p>Two suites, each with two bedrooms. Live rates and availability open in our booking engine.</p>
            </div>
            <div data-reveal><RetreatPanel id="book" /></div>
          </div>
        </section>

        <section id="suites" className="cm-suites" aria-labelledby="cm-suites-h">
          <header className="cm-section-head">
            <p className="cm-index" data-reveal>02 — The suites</p>
            <h2 id="cm-suites-h" className="cm-split">{lines("Two suites.", <em>Every view.</em>)}</h2>
          </header>
          <div className="cm-suite-grid">
            {SUITES.map((s, i) => (
              <article key={s.id} className="cm-suite" data-reveal>
                <figure className="cm-suite-media" data-clip>
                  <Stock name={i === 0 ? "noir-suite-living" : "noir-suite-window"} alt={i === 0 ? "A living room framing snowy mountains" : "A bedroom window opening onto mountains"} parallax={5} sizes="(max-width: 900px) 100vw, 50vw" />
                </figure>
                <p className="cm-suite-n">{i === 0 ? "King’s side" : "Queen’s side"}</p>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <ul>{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
                <button type="button" className="cm-link" onClick={() => scrollToTarget("#book-final", { offset: -96 })}>Check dates →</button>
              </article>
            ))}
          </div>
          <FeatureShowcase variant="mosaic" className="cm-fs" reduced={reduced} />
        </section>

        <section id="experiences" className="cm-exp" aria-labelledby="cm-exp-h">
          <header className="cm-section-head">
            <p className="cm-index" data-reveal>03 — Experiences</p>
            <h2 id="cm-exp-h" className="cm-split">{lines("Every square,", <em>a different evening.</em>)}</h2>
          </header>
          <ul className="cm-board">
            {SQUARES.map((sq, i) => {
              if ("img" in sq) return <li key={i} className="cm-sq cm-sq--img"><Stock name={sq.img} alt={sq.alt} sizes="(max-width: 760px) 50vw, 25vw" /></li>;
              const e = EXPERIENCES.find((x) => x.id === sq.exp)!;
              return (
                <li key={i} className="cm-sq cm-sq--text">
                  <p className="cm-sq-kind">{e.kind === "nearby" ? "Nearby" : e.kind === "dining" ? "Dining" : "At Checkmate"}</p>
                  <h3>{e.title}</h3>
                  <p>{e.text}</p>
                </li>
              );
            })}
          </ul>
          <p className="cm-exp-more" data-reveal>
            Also nearby: {EXPERIENCES.filter((e) => !SQUARES.some((s) => "exp" in s && s.exp === e.id)).map((e) => e.title).join(" · ")}
          </p>
        </section>

        <section id="diary" className="cm-diary" aria-labelledby="cm-diary-h">
          <div className="cm-diary-inner">
            <div>
              <p className="cm-index" data-reveal>04 — Dining</p>
              <h2 id="cm-diary-h" className="cm-split">{lines(DIARY.title)}</h2>
              <p className="cm-diary-sub" data-reveal>{DIARY.subtitle}</p>
              <p data-reveal>{DIARY.text}</p>
              <p className="cm-diary-call" data-reveal>{DIARY.reservation}: <a href={`tel:${SITE.diaryPhone.replace(/\s/g, "")}`}>{SITE.diaryPhone}</a></p>
            </div>
            <ul className="cm-dishes">
              {DIARY.dishes.map((d) => <li key={d.name} data-reveal><h3>{d.name}</h3><p>{d.text}</p></li>)}
            </ul>
          </div>
        </section>

        <section className="cm-sustain" aria-labelledby="cm-sustain-h">
          <header className="cm-section-head">
            <p className="cm-index" data-reveal>05 — Considered moves</p>
            <h2 id="cm-sustain-h" className="cm-split">{lines("Built with respect", <em>for the Himalayas.</em>)}</h2>
          </header>
          <ul className="cm-sustain-list">
            {SUSTAINABILITY.map((s) => <li key={s.title} data-reveal><h3>{s.title}</h3><p>{s.text}</p></li>)}
          </ul>
        </section>

        <section className="cm-words" aria-labelledby="cm-words-h">
          <h2 id="cm-words-h" className="cm-index" data-reveal>06 — Guest words</h2>
          <ul>
            {GUEST_WORDS.map((g) => (
              <li key={g.name} data-reveal>
                <blockquote>“{g.quote}”</blockquote>
                <p>— {g.name}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="connect" className="cm-close" aria-labelledby="cm-close-h">
          <div className="cm-close-bg"><Stock name="noir-winterline" alt="" parallax={10} /></div>
          <div className="cm-close-inner">
            <h2 id="cm-close-h" className="cm-split">{lines("Your move.")}</h2>
            <p data-reveal>{INTRO.retreat}</p>
            <BookingWidget id="book-final" layout="bar" className="cm-bw" submitLabel="Reserve your dates" />
            <div className="cm-close-meta">
              <ContactBlock />
              <ul className="cm-directions">
                {SITE.directions.map((d) => <li key={d.from}><span>{d.from}</span> {d.time} · {d.distance}</li>)}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="cm-footer">
        <Wordmark className="cm-footer-mark" />
        <p>{SITE.tagline}</p>
        <p><a href={SITE.policies.privacy}>Privacy policy</a> · <a href={SITE.policies.refund}>Refund & cancellation</a></p>
        <IllustrativeNote />
      </footer>

      <div className="mobile-book cm-mobile-book" data-hidden={!pastIntro}>
        <span>Charleville, Mussoorie</span>
        <button type="button" onClick={() => scrollToTarget("#book-final", { offset: -80 })}>Check dates</button>
      </div>
      <ConceptSwitcher current="/concepts/checkmate" />
    </div>
  );
}

/** Overlay copy reads the same scroll clock as the canvas. */
function applyOverlays(root: HTMLElement, p: number, entry: number) {
  const set = (key: string, opacity: number, y = 0, x = 0) => {
    const el = root.querySelector<HTMLElement>(`[data-ov="${key}"]`);
    if (!el) return;
    el.style.opacity = String(opacity);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.style.visibility = opacity < 0.01 ? "hidden" : "visible";
  };
  // the opening line rises in as the entrance settles and leaves on the first scroll
  const openIn = seg(entry, [0.4, 1]);
  const openOut = seg(p, [START + 0.004, START + 0.03]);
  set("open", Math.min(openIn, 1 - openOut), (1 - openIn) * 16 - openOut * 24);
  const mateIn = seg(p, [PHASE.mateText[0], PHASE.mateText[0] + 0.04]);
  const mateOut = 1 - seg(p, [PHASE.mateText[1], PHASE.mateText[1] + 0.03]);
  const mate = root.querySelector<HTMLElement>('[data-ov="mate"]');
  if (mate) mate.style.setProperty("--m", String(mateIn));
  set("mate", Math.min(mateIn, mateOut));
  const hero = seg(p, PHASE.hero);
  set("hero", hero, (1 - hero) * 26);
  set("tag", seg(p, PHASE.reveal));
}
