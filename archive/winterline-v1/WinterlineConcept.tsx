import { useEffect, useRef, useState } from "react";
import { BookingWidget } from "../../shared/BookingWidget";
import { DIARY, EXPERIENCES, GUEST_WORDS, INTRO, SITE, SUITES, SUITE_FEATURES, SUSTAINABILITY } from "../../shared/content";
import { useKingCursor } from "../../shared/kingCursor";
import { ScrollTrigger, gsap, scrollToTarget, useIsCompact, useLenis, useReducedMotion, useReveal } from "../../shared/motion";
import { ConceptSwitcher, ContactBlock, IllustrativeNote, Stock, Wordmark, type StockKey } from "../../shared/ui";
import { useDocumentTitle, useFonts } from "../../shared/useFonts";
import "./winterline.css";

const exp = (id: string) => EXPERIENCES.find((e) => e.id === id)!;

/* A day in Charleville, in the light it is lived in. Each entry restates verified copy. */
const DAY: { when: string; title: string; text: string; img: StockKey; alt: string; tone: string }[] = [
  { when: "First light", title: "Sun from behind the peaks", text: "One bedroom of the Landour View Suite greets the morning sun as it rises from behind the snow-clad Himalayas.", img: "light-range", alt: "A Himalayan range in clear morning light", tone: "#e9eef2" },
  { when: "Morning", title: "Coffee and the Winterline", text: "Start the day in the Mountain View Suite marvelling at the Mussoorie Winterline over your morning coffee, on a 5-metre-wide private balcony.", img: "light-living", alt: "A bright living room with tall windows onto mountains", tone: "#f3ede2" },
  { when: "At the table", title: "The Mussoorie Diary", text: "Aloo Gutke, Dal Makhani and Momo at Checkmate’s reservation-only boutique café — Garhwali and Indian, locally sourced.", img: "light-momos", alt: "Steamed dumplings in a bamboo basket", tone: "#f4e7d6" },
  { when: "Afternoon", title: "Pine trails to Dalai Hills", text: `${exp("dalai-hills").text} Or a short drive to Landour for British-era charm and cosy cafés.`, img: "light-pines", alt: "Mist rising through pine trees on a hillside", tone: "#e8ece4" },
  { when: "Dusk", title: "Sunset at George Everest", text: "The Landour View Suite’s second bedroom faces George Everest Peak, where the sun sets in a breathtaking display each evening.", img: "light-branches", alt: "Bare branches against a snow peak at dusk", tone: "#f2e2dc" },
  { when: "Night", title: "Fire, games and stars", text: `${exp("bonfire").text} Board games on request, and clear skies for stargazing from October to February.`, img: "night-bonfire", alt: "A campfire beneath trees and stars", tone: "#d9d6e4" },
];

export default function WinterlineConcept() {
  useFonts("family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Work+Sans:wght@300;400;500");
  useDocumentTitle("Checkmate Stays — Concept 4 · Winterline");
  useKingCursor({ fill: "#6b3331", stroke: "#f4efe6", accent: "#e9835e" });
  const reduced = useReducedMotion();
  const compact = useIsCompact();
  useLenis(!reduced);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useReveal(root, reduced);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || reduced) return;
    const ctx = gsap.context(() => {
      // the line of light draws across the hero
      gsap.fromTo(".wl-line-glow", { scaleX: 0 }, { scaleX: 1, duration: 2.4, ease: "power2.inOut", delay: 0.3 });
      gsap.from(".wl-hero h1 .wl-l", { yPercent: 110, duration: 1.2, ease: "power4.out", stagger: 0.12, delay: 0.1 });
      gsap.to(".wl-arch img", { yPercent: -8, ease: "none", scrollTrigger: { trigger: ".wl-hero", start: "top top", end: "bottom top", scrub: true } });

      // one horizontal journal on wide screens; a plain vertical list on small ones
      const list = track.current;
      if (list && !compact) {
        const distance = () => list.scrollWidth - window.innerWidth;
        gsap.to(list, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: { trigger: ".wl-day", start: "top top", end: () => `+=${distance()}`, scrub: 0.6, pin: true, invalidateOnRefresh: true, anticipatePin: 1 },
        });
        gsap.to(".wl-day-sun", { left: "100%", ease: "none", scrollTrigger: { trigger: ".wl-day", start: "top top", end: () => `+=${distance()}`, scrub: true } });
      }
    }, el);
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => { window.clearTimeout(refresh); ctx.revert(); };
  }, [reduced, compact]);

  const go = (href: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToTarget(href, { offset: -80 }); };

  return (
    <div className="wl" ref={root}>
      <a className="skip-link" href="#book">Skip to booking</a>
      <header className={`wl-header ${scrolled ? "is-scrolled" : ""}`}>
        <nav className="wl-nav wl-nav--left" aria-label="Primary">
          <a href="#suites" onClick={go("#suites")}>Suites</a>
          <a href="#day" onClick={go("#day")}>A day here</a>
        </nav>
        <a href="#top" className="wl-logo" onClick={go("#top")} aria-label="Checkmate Stays — top"><Wordmark /></a>
        <nav className="wl-nav wl-nav--right" aria-label="Secondary">
          <a href="#diary" onClick={go("#diary")}>Mussoorie Diary</a>
          <button type="button" className="wl-book" onClick={() => scrollToTarget("#book", { offset: -110 })}>Book a stay</button>
        </nav>
      </header>

      <section id="top" className="wl-hero" aria-labelledby="wl-hero-h">
        <div className="wl-hero-text">
          <p className="wl-masthead"><span>No. 01</span><span>Charleville, Mussoorie</span><span>{SITE.kind}</span></p>
          <h1 id="wl-hero-h">
            <span className="wl-mask"><span className="wl-l">The day ends</span></span>
            <span className="wl-mask"><span className="wl-l">in a <em>line of light.</em></span></span>
          </h1>
          <p className="wl-hero-sub">Two suites with private L-shaped balconies, a garden shaded by a 200-year-old oak, and the Mussoorie Winterline across the valley.</p>
        </div>
        <figure className="wl-arch">
          <Stock name="light-winterline" alt="Layered blue ridgelines beneath a pink and amber sky" eager sizes="(max-width: 900px) 92vw, 42vw" />
          <figcaption>Illustrative imagery</figcaption>
        </figure>
        <div className="wl-line" aria-hidden="true"><span className="wl-line-glow" /></div>
        <div className="wl-hero-book" id="book">
          <BookingWidget className="wl-bw" title="Reserve your view" />
        </div>
      </section>

      <main>
        <section className="wl-intro" aria-labelledby="wl-intro-h">
          <div className="wl-intro-col">
            <p className="wl-kicker" data-reveal>Welcome</p>
            <h2 id="wl-intro-h" data-reveal>{INTRO.pauseTitle}</h2>
          </div>
          <div className="wl-intro-col wl-dropcap" data-reveal>
            <p>{INTRO.lead}</p>
            <p>{INTRO.oak}</p>
          </div>
        </section>

        <section id="day" className="wl-day" aria-labelledby="wl-day-h">
          <div className="wl-day-head">
            <p className="wl-kicker">A day at Checkmate</p>
            <h2 id="wl-day-h">From first light<br /><em>to the Winterline</em></h2>
            <div className="wl-day-rail" aria-hidden="true"><span className="wl-day-sun" /></div>
          </div>
          <ol className="wl-day-track" ref={track}>
            {DAY.map((d, i) => (
              <li key={d.when} className="wl-day-card" style={{ ["--tone" as string]: d.tone }}>
                <figure><Stock name={d.img} alt={d.alt} sizes="(max-width: 760px) 92vw, 36vw" /></figure>
                <p className="wl-when"><span>{String(i + 1).padStart(2, "0")}</span>{d.when}</p>
                <h3>{d.title}</h3>
                <p>{d.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="suites" className="wl-suites" aria-labelledby="wl-suites-h">
          <header className="wl-suites-head">
            <p className="wl-kicker" data-reveal>The suites</p>
            <h2 id="wl-suites-h" data-reveal>Two suites, <em>one horizon</em></h2>
          </header>
          {SUITES.map((s, i) => (
            <article key={s.id} className={`wl-suite ${i ? "is-flip" : ""}`}>
              <figure data-reveal><Stock name={i === 0 ? "light-bedroom" : "light-hilltown"} alt={i === 0 ? "A light bedroom with windows facing mountains" : "A hill town spread across a green valley"} sizes="(max-width: 900px) 100vw, 55vw" /></figure>
              <div className="wl-suite-body" data-reveal>
                <p className="wl-numeral" aria-hidden="true">{i === 0 ? "I" : "II"}</p>
                <h3>{s.name}</h3>
                <p className="wl-suite-short">{s.short}</p>
                <p>{s.description}</p>
                <ul>{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
                <button type="button" className="wl-text-btn" onClick={() => scrollToTarget("#book-final", { offset: -120 })}>Check dates for this suite</button>
              </div>
            </article>
          ))}
          <dl className="wl-specs">
            {SUITE_FEATURES.map((f) => <div key={f.title} data-reveal><dt>{f.title}</dt><dd>{f.text}</dd></div>)}
          </dl>
        </section>

        <section id="diary" className="wl-diary" aria-labelledby="wl-diary-h">
          <figure data-reveal><Stock name="dal" alt="Dal in a bowl with rice" sizes="(max-width: 900px) 100vw, 40vw" /></figure>
          <div>
            <p className="wl-kicker" data-reveal>{DIARY.subtitle}</p>
            <h2 id="wl-diary-h" data-reveal>{DIARY.title}</h2>
            <p data-reveal>{DIARY.text}</p>
            <ol>{DIARY.dishes.map((d) => <li key={d.name} data-reveal><h3>{d.name}</h3><p>{d.text}</p></li>)}</ol>
            <p className="wl-diary-call" data-reveal>{DIARY.reservation} — <a href={`tel:${SITE.diaryPhone.replace(/\s/g, "")}`}>{SITE.diaryPhone}</a></p>
          </div>
        </section>

        <section className="wl-notes" aria-labelledby="wl-notes-h">
          <h2 id="wl-notes-h" data-reveal>Notes on <em>care</em></h2>
          <ol>{SUSTAINABILITY.map((s) => <li key={s.title} data-reveal><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
        </section>

        <section className="wl-words" aria-label="Guest words">
          {GUEST_WORDS.map((g, i) => (
            <figure key={g.name} className={i === 0 ? "is-lead" : ""} data-reveal>
              <blockquote>{g.quote}</blockquote>
              <figcaption>— {g.name}</figcaption>
            </figure>
          ))}
        </section>

        <section id="connect" className="wl-close" aria-labelledby="wl-close-h">
          <div className="wl-close-card">
            <p className="wl-kicker">Your retreat awaits</p>
            <h2 id="wl-close-h">Keep a morning<br /><em>for the mountains.</em></h2>
            <p>{INTRO.retreat}</p>
            <BookingWidget id="book-final" layout="bar" className="wl-bw wl-bw--maroon" submitLabel="Check availability" />
          </div>
          <div className="wl-close-meta">
            <div><p className="wl-kicker">Find us</p><ContactBlock /></div>
            <div>
              <p className="wl-kicker">Getting here</p>
              <ul>{SITE.directions.map((d) => <li key={d.from}><strong>{d.time}</strong> · {d.distance} from {d.from}</li>)}</ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="wl-footer">
        <Wordmark className="wl-footer-mark" />
        <p><a href={SITE.policies.privacy}>Privacy policy</a> · <a href={SITE.policies.refund}>Refund & cancellation</a> · <a href={SITE.instagram}>{SITE.instagramHandle}</a></p>
        <IllustrativeNote />
      </footer>

      <div className="mobile-book wl-mobile-book" data-hidden={!scrolled}>
        <span>Charleville · Mussoorie</span>
        <button type="button" onClick={() => scrollToTarget("#book-final", { offset: -100 })}>Book a stay</button>
      </div>
      <ConceptSwitcher current="/concepts/winterline" />
    </div>
  );
}
