import { useEffect, useRef, useState } from "react";
import { BookingWidget } from "../../shared/BookingWidget";
import { DIARY, EXPERIENCES, GUEST_WORDS, INTRO, NAV, SITE, SUITES, SUSTAINABILITY } from "../../shared/content";
import { useKingCursor } from "../../shared/kingCursor";
import { gsap, scrollToTarget, useIsCompact, useLenis, useReducedMotion, useReveal } from "../../shared/motion";
import { ConceptSwitcher, ContactBlock, IllustrativeNote, Stock, Wordmark, type StockKey } from "../../shared/ui";
import { useDocumentTitle, useFonts } from "../../shared/useFonts";
import { Starfield } from "./Starfield";
import { FeatureShowcase } from "../../shared/FeatureShowcase";
import { CursorHalo, useTilt } from "../../shared/CursorHalo";
import "./night-watch.css";

const exp = (id: string) => EXPERIENCES.find((e) => e.id === id)!;

/* The evening at Checkmate, in the order the sky changes. Phases, not clock times —
   the live site publishes no schedule. */
const NIGHT: { phase: string; title: string; text: string; img: StockKey; alt: string }[] = [
  { phase: "Dusk", title: "Sunset over George Everest Peak", text: "From the Landour View Suite’s second bedroom, the sun sets behind George Everest Peak in a breathtaking display each evening.", img: "noir-winterline", alt: "Himalayan ridgelines at dusk" },
  { phase: "Evening", title: exp("bonfire").title, text: exp("bonfire").text, img: "night-bonfire", alt: "A campfire glowing beneath pine trees at night" },
  { phase: "Supper", title: DIARY.title, text: `${DIARY.text} ${DIARY.reservation}.`, img: "noir-thali", alt: "A spread of Indian dishes" },
  { phase: "Late", title: exp("board-games").title, text: exp("board-games").text, img: "night-lounge", alt: "A dark living room facing mountains at night" },
  { phase: "Midnight", title: "The sky over Dalai Hills", text: exp("stargazing").text, img: "night-star-trails", alt: "Star trails circling above snow peaks" },
];

const ORION = {
  stars: [
    { id: "Meissa", x: 200, y: 70, r: 2.6 }, { id: "Betelgeuse", x: 118, y: 112, r: 5, warm: true }, { id: "Bellatrix", x: 278, y: 132, r: 3.6 },
    { id: "Alnitak", x: 172, y: 282, r: 3.4 }, { id: "Alnilam", x: 204, y: 268, r: 3.6 }, { id: "Mintaka", x: 236, y: 255, r: 3.2 },
    { id: "Saiph", x: 140, y: 425, r: 3.4 }, { id: "Rigel", x: 300, y: 402, r: 5.2 },
  ],
  lines: [["Meissa", "Betelgeuse"], ["Meissa", "Bellatrix"], ["Betelgeuse", "Alnitak"], ["Bellatrix", "Mintaka"], ["Alnitak", "Alnilam"], ["Alnilam", "Mintaka"], ["Alnitak", "Saiph"], ["Mintaka", "Rigel"]],
};

/** Booking hint grounded in the live site: skies are clearest from October to February. */
function skyHint(checkin: string) {
  if (!checkin) return null;
  const m = Number(checkin.slice(5, 7));
  return m >= 10 || m <= 2
    ? "✦ Your dates fall in the clearest-sky months, October to February."
    : "Skies over Dalai Hills are clearest from October to February.";
}

function istClock() {
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date());
}

export default function NightWatchConcept() {
  useFonts("family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500&family=IBM+Plex+Mono:wght@400");
  useDocumentTitle("Checkmate Stays — Concept 3 · Night Watch");
  useKingCursor({ fill: "#eef2ff", stroke: "#060a16", accent: "#f1a51e" });
  const reduced = useReducedMotion();
  const compact = useIsCompact();
  useLenis(!reduced);
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, reduced);
  useTilt(root, !reduced);
  const [clock, setClock] = useState(istClock);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setClock(istClock()), 30000);
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.clearInterval(id); window.removeEventListener("scroll", onScroll); };
  }, []);

  // scroll-linked scenes
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set(".nw-orion-line", { strokeDashoffset: 0 });
        gsap.set(".nw-orion-star, .nw-orion-label", { opacity: 1 });
        return;
      }
      // hero: the photograph sinks and the copy lifts as the night begins
      gsap.to(".nw-hero-photo", { yPercent: 12, scale: 1.08, ease: "none", scrollTrigger: { trigger: ".nw-hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".nw-hero-copy", { y: -60, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".nw-hero", start: "30% top", end: "bottom top", scrub: true } });
      // the sky deepens from dusk to midnight through the evening timeline
      gsap.fromTo(".nw-sky-night", { opacity: 0 }, { opacity: 1, ease: "none", scrollTrigger: { trigger: ".nw-night", start: "top 60%", end: "bottom bottom", scrub: true } });
      gsap.fromTo(".nw-night-progress span", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".nw-night-list", start: "top 60%", end: "bottom 60%", scrub: true } });
      // images open like a telescope iris as they come into view
      gsap.utils.toArray<HTMLElement>(".nw-iris").forEach((fig) => {
        gsap.fromTo(fig, { clipPath: "circle(16% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", ease: "none", scrollTrigger: { trigger: fig, start: "top 92%", end: "top 40%", scrub: 0.5 } });
        const img = fig.querySelector("img");
        if (img) gsap.fromTo(img, { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: fig, start: "top 92%", end: "top 40%", scrub: 0.5 } });
      });
      // Orion draws itself, line by line
      const tl = gsap.timeline({ scrollTrigger: { trigger: ".nw-orion", start: "top 70%", end: "center 45%", scrub: 0.6 } });
      tl.fromTo(".nw-orion-star", { opacity: 0, scale: 0.4, transformOrigin: "center" }, { opacity: 1, scale: 1, stagger: 0.05, duration: 0.3 })
        .fromTo(".nw-orion-line", { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.08, duration: 0.4 }, 0.15)
        .fromTo(".nw-orion-label", { opacity: 0 }, { opacity: 1, stagger: 0.04, duration: 0.2 }, 0.5);
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  const go = (href: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToTarget(href, { offset: -64 }); };
  const star = (id: string) => ORION.stars.find((s) => s.id === id)!;

  return (
    <div className="nw" ref={root}>
      <a className="skip-link" href="#book">Skip to booking</a>
      <header className={`nw-header ${scrolled ? "is-scrolled" : ""}`}>
        <a href="#top" className="nw-logo" onClick={go("#top")} aria-label="Checkmate Stays — top"><Wordmark /></a>
        <nav className="nw-nav" aria-label="Primary">
          {NAV.map((n) => <a key={n.href} href={n.href} onClick={go(n.href)}>{n.label}</a>)}
        </nav>
        <button type="button" className="nw-book" onClick={() => scrollToTarget("#book", { offset: -100 })}>Reserve</button>
      </header>

      <section id="top" className="nw-hero" aria-labelledby="nw-hero-h">
        <div className="nw-hero-photo"><Stock name="night-milkyway-peaks" alt="The Milky Way rising over snow-capped peaks" eager /></div>
        <Starfield reduced={reduced} density={compact ? 0.6 : 1} className="nw-stars" connect={!compact && !reduced} />
        <div className="nw-hero-copy">
          <p className="nw-log"><span>Charleville, Mussoorie</span><span>30.4° N · 78.1° E</span><span>{clock} IST</span></p>
          <h1 id="nw-hero-h">Stay up<br /><em>for the stars.</em></h1>
          <p className="nw-hero-sub">Clear Himalayan skies over Dalai Hills, especially from October to February — seen from a boutique homestay of two suites.</p>
          {!compact && !reduced && <p className="nw-hero-hint" aria-hidden="true">Move across the sky to draw your own constellation</p>}
        </div>
        <div className="nw-hero-book" id="book">
          <BookingWidget className="nw-bw" title="Observation log · plan your nights" hint={skyHint} />
        </div>
        <p className="nw-illus">Illustrative imagery</p>
      </section>

      <main>
        <section className="nw-intro" aria-labelledby="nw-intro-h">
          <p className="nw-kicker" data-reveal>Welcome to Checkmate</p>
          <h2 id="nw-intro-h" data-reveal>{INTRO.pauseTitle}</h2>
          <p className="nw-intro-text" data-reveal>{INTRO.lead}</p>
        </section>

        <section className="nw-night" aria-labelledby="nw-night-h">
          <div className="nw-sky" aria-hidden="true"><div className="nw-sky-dusk" /><div className="nw-sky-night" /></div>
          <header className="nw-night-head">
            <p className="nw-kicker" data-reveal>An evening at Checkmate</p>
            <h2 id="nw-night-h" data-reveal>From first lamp<br /><em>to last star.</em></h2>
          </header>
          <div className="nw-night-wrap">
            <div className="nw-night-progress" aria-hidden="true"><span /></div>
            <ol className="nw-night-list">
              {NIGHT.map((n, i) => (
                <li key={n.phase} className={i % 2 ? "is-right" : ""} data-reveal>
                  <figure className="nw-iris" data-cursor="image"><Stock name={n.img} alt={n.alt} sizes="(max-width: 900px) 100vw, 40vw" /></figure>
                  <div className="nw-night-body">
                    <p className="nw-phase">{String(i + 1).padStart(2, "0")} · {n.phase}</p>
                    <h3>{n.title}</h3>
                    <p>{n.text}</p>
                    {n.phase === "Supper" && <a href={`tel:${SITE.diaryPhone.replace(/\s/g, "")}`}>Call {SITE.diaryPhone}</a>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="experiences" className="nw-orion" aria-labelledby="nw-orion-h">
          <div className="nw-orion-copy">
            <p className="nw-kicker" data-reveal>Stargazing</p>
            <h2 id="nw-orion-h" data-reveal>Find Orion<br /><em>from the garden.</em></h2>
            <p data-reveal>{exp("stargazing").text}</p>
            <dl className="nw-data" data-reveal>
              <div><dt>Best months</dt><dd>Oct – Feb</dd></div>
              <div><dt>Constellations</dt><dd>Orion · Canis Major · Taurus</dd></div>
              <div><dt>Early evening</dt><dd>Venus · Mars</dd></div>
            </dl>
          </div>
          <figure className="nw-orion-fig" data-cursor="image">
            <svg viewBox="0 0 400 500" role="img" aria-label="The constellation Orion">
              {ORION.lines.map(([a, b]) => (
                <line key={a + b} className="nw-orion-line" x1={star(a).x} y1={star(a).y} x2={star(b).x} y2={star(b).y} pathLength={1} />
              ))}
              {ORION.stars.map((s) => (
                <g key={s.id}>
                  <circle className="nw-orion-star" cx={s.x} cy={s.y} r={s.r} data-warm={s.warm ? "" : undefined} />
                  {s.id === "Alnilam" ? (
                    <text className="nw-orion-label" x={s.x + 6} y={s.y + 24} textAnchor="middle">{s.id}</text>
                  ) : (
                    <text className="nw-orion-label" x={s.x + (s.x > 200 ? 12 : -12)} y={s.y + 4} textAnchor={s.x > 200 ? "start" : "end"}>{s.id}</text>
                  )}
                </g>
              ))}
            </svg>
          </figure>
        </section>

        <section id="suites" className="nw-suites" aria-labelledby="nw-suites-h">
          <header>
            <p className="nw-kicker" data-reveal>The suites</p>
            <h2 id="nw-suites-h" data-reveal>Two suites,<br /><em>two horizons.</em></h2>
          </header>
          <div className="nw-suite-grid">
            {SUITES.map((s, i) => (
              <article key={s.id} className="nw-suite" data-reveal data-tilt data-cursor="card">
                <figure className="nw-iris"><Stock name={i === 0 ? "night-lodge" : "night-cabin"} alt={i === 0 ? "A lodge with lit windows beneath peaks at night" : "A cabin under a starry sky"} sizes="(max-width: 900px) 100vw, 50vw" /></figure>
                <p className="nw-phase">{i === 0 ? "Morning coffee · the Mussoorie Winterline" : "A sunrise bedroom · a sunset bedroom"}</p>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <ul>{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
              </article>
            ))}
          </div>
          <FeatureShowcase variant="aperture" className="nw-fs" reduced={reduced} cardAttrs={{ "data-cursor": "image" }} images={{ 2: { img: "noir-suite-living", alt: "A living room framing snowy mountains" } }} />
        </section>

        <section className="nw-day" aria-labelledby="nw-day-h">
          <h2 id="nw-day-h" className="nw-kicker" data-reveal>By day, nearby</h2>
          <ul>
            {EXPERIENCES.filter((e) => e.kind === "nearby").map((e) => (
              <li key={e.id} data-reveal data-cursor="card"><h3>{e.title}</h3><p>{e.text}</p></li>
            ))}
          </ul>
        </section>

        <section id="diary" className="nw-diary" aria-labelledby="nw-diary-h">
          <p className="nw-kicker" data-reveal>{DIARY.subtitle}</p>
          <h2 id="nw-diary-h" data-reveal>{DIARY.title}</h2>
          <ul>{DIARY.dishes.map((d) => <li key={d.name} data-reveal><h3>{d.name}</h3><p>{d.text}</p></li>)}</ul>
          <p data-reveal>{DIARY.reservation} · <a href={`tel:${SITE.diaryPhone.replace(/\s/g, "")}`}>{SITE.diaryPhone}</a></p>
        </section>

        <section className="nw-care" aria-labelledby="nw-care-h">
          <h2 id="nw-care-h" className="nw-kicker" data-reveal>Dark skies need light footprints</h2>
          <ul>{SUSTAINABILITY.map((s) => <li key={s.title} data-reveal><h3>{s.title}</h3><p>{s.text}</p></li>)}</ul>
        </section>

        <section className="nw-words" aria-label="Guest words">
          {GUEST_WORDS.map((g) => (
            <figure key={g.name} data-reveal data-tilt data-cursor="card"><blockquote>“{g.quote}”</blockquote><figcaption>{g.name}</figcaption></figure>
          ))}
        </section>

        <section id="connect" className="nw-close" aria-labelledby="nw-close-h">
          <div className="nw-close-photo"><Stock name="peak-stars" alt="" /></div>
          <Starfield reduced={reduced} density={compact ? 0.4 : 0.7} className="nw-stars" />
          <div className="nw-close-inner">
            <h2 id="nw-close-h" data-reveal>Reserve<br /><em>your nights.</em></h2>
            <BookingWidget layout="bar" className="nw-bw" submitLabel="Check availability" hint={skyHint} />
            <div className="nw-close-meta">
              <ContactBlock />
              <ul>{SITE.directions.map((d) => <li key={d.from}>{d.from} — {d.time} · {d.distance}</li>)}</ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="nw-footer">
        <Wordmark className="nw-footer-mark" />
        <p>{SITE.tagline}</p>
        <p><a href={SITE.policies.privacy}>Privacy policy</a> · <a href={SITE.policies.refund}>Refund & cancellation</a></p>
        <IllustrativeNote />
      </footer>

      <div className="mobile-book nw-mobile-book" data-hidden={!scrolled}>
        <span>{clock} IST · Mussoorie</span>
        <button type="button" onClick={() => scrollToTarget("#connect", { offset: 0 })}>Reserve</button>
      </div>
      <ConceptSwitcher current="/concepts/night-watch" />
      <CursorHalo />
    </div>
  );
}
