import { useCallback, useEffect, useRef, useState } from "react";
import { BookingWidget } from "../../shared/BookingWidget";
import { FeatureShowcase } from "../../shared/FeatureShowcase";
import { DIARY, EXPERIENCES, GUEST_WORDS, SITE, SUITES, SUSTAINABILITY } from "../../shared/content";
import { kingCursorCss, useKingCursor } from "../../shared/kingCursor";
import { gsap, scrollToTarget, useIsCompact, useImageMotion, useReducedMotion, useReveal } from "../../shared/motion";
import { useScrollRail } from "../../shared/scrollRail";
import { DockTabs } from "../../shared/DockTabs";
import { ConceptSwitcher, IllustrativeNote, Stock, Wordmark, type StockKey } from "../../shared/ui";
import { useDocumentTitle, useFonts } from "../../shared/useFonts";
import { MountainScene } from "./mountainScene";
import "./living-green.css";

const CURSOR = { fill: "#f4f0ea", stroke: "#1d232b", accent: "#f1c48a" };

const exp = (id: string) => EXPERIENCES.find((e) => e.id === id)!;
const RAIL: { id: string; img: StockKey; alt: string }[] = [
  { id: "stargazing", img: "peak-stars", alt: "Stars above a snowy peak" },
  { id: "bonfire", img: "noir-bonfire", alt: "A campfire under the night sky" },
  { id: "board-games", img: "rail-board-games", alt: "A board game laid out on a wooden table" },
  { id: "dalai-hills", img: "green-trail", alt: "A footpath climbing a mountainside" },
  { id: "waterfalls", img: "green-forest-light", alt: "Morning light in a pine forest" },
  { id: "company-garden", img: "rail-garden", alt: "A waterfall tumbling over rocks in a garden" },
  { id: "landour", img: "pine-road", alt: "A mountain road winding through pines" },
  { id: "mall-road", img: "rail-hilltown", alt: "A hill town spread across a ridge at sunset" },
  { id: "temple", img: "rail-temple", alt: "The painted interior of a Buddhist temple" },
];
/** Tabs over the sequence: each opens at its first card. */
const RAIL_TABS = [{ label: "At Checkmate", at: 0 }, { label: "Walks & water", at: 3 }, { label: "Town & temple", at: 6 }];

function supportsWebGL2() {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

export default function LivingGreenConcept() {
  useFonts("family=Lexend:wght@200;300;400;500");
  useDocumentTitle("Checkmate Stays — Concept 4 · Highlands");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const cursorStage = useRef(0);
  // the evolving cursor also lives inside the hero document
  const pushCursor = useCallback((q: number) => {
    cursorStage.current = q;
    const doc = frameRef.current?.contentDocument;
    if (!doc?.head) return;
    let tag = doc.getElementById("checkmate-cursor");
    if (!tag) { tag = doc.createElement("style"); tag.id = "checkmate-cursor"; doc.head.appendChild(tag); }
    tag.textContent = kingCursorCss(CURSOR, q);
  }, []);
  useKingCursor(CURSOR, pushCursor);

  const reduced = useReducedMotion();
  const compact = useIsCompact();
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(supportsWebGL2);
  const [frameHeight, setFrameHeight] = useState<number | null>(null);
  const [openSuite, setOpenSuite] = useState(0);
  const [quote, setQuote] = useState(0);
  const [pastHero, setPastHero] = useState(false);
  const expRef = useRef<HTMLElement>(null);
  const rail = useRef<HTMLUListElement>(null);
  // the experiences hold in view and travel sideways as the page scrolls; phones swipe
  const pinRail = !compact && !reduced;
  const seq = useScrollRail(expRef, rail, { pinned: pinRail });
  const railTab = RAIL_TABS.reduce((t, tab, i) => (seq.active >= tab.at ? i : t), 0);
  useReveal(root, reduced);
  useImageMotion(root, reduced);

  const focusBooking = useCallback(() => {
    const band = document.querySelector<HTMLElement>("#book");
    if (!band) return;
    const focus = () => band.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    // focusing mid-flight would cancel a long smooth scroll (e.g. from the footer), so wait for it to land
    if (Math.abs(band.getBoundingClientRect().top + 24) < 4) { focus(); return; }
    scrollToTarget(band, { offset: -24 });
    if ("onscrollend" in window) window.addEventListener("scrollend", focus, { once: true });
    else setTimeout(focus, 1200);
  }, []);

  // the authored hero document: mount the mountain scenery into its #scene canvas
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !webgl) return;
    let scene: MountainScene | undefined;
    let onScreen = true;
    type ParkWindow = Window & { __park?: (on: boolean) => void };
    const mount = () => {
      const win = frame.contentWindow as (Window & { __park?: (on: boolean) => void }) | null;
      const canvas = frame.contentDocument?.getElementById("scene") as HTMLCanvasElement | null;
      if (!win || !canvas || scene) return;
      scene = new MountainScene(frame, { compact, reduced, canvas, eventWindow: win });
      pushCursor(cursorStage.current);
      // the observer may have fired before this document existed; hand it the current state
      (win as ParkWindow).__park?.(!onScreen);
    };
    if (frame.contentDocument?.readyState === "complete" && frame.contentDocument.getElementById("scene")) mount();
    frame.addEventListener("load", mount);
    // park every loop in the hero document while it is off-screen
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      (frame.contentWindow as ParkWindow | null)?.__park?.(!onScreen);
    });
    io.observe(frame);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.data?.source !== "checkmate-highlands") return;
      if (e.data.action === "book") focusBooking();
      else if (e.data.action === "goto") scrollToTarget(e.data.target, { offset: -24 });
      else if (e.data.action === "layout") setFrameHeight(e.data.value ?? null);
    };
    window.addEventListener("message", onMessage);
    return () => {
      frame.removeEventListener("load", mount);
      io.disconnect();
      window.removeEventListener("message", onMessage);
      scene?.dispose();
    };
  }, [compact, reduced, webgl, focusBooking, pushCursor]);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || reduced) return;
    const ctx = gsap.context(() => {
      // the hills photograph widens from a framed window to full bleed as it crosses the screen
      gsap.fromTo(".lg-window-frame", { clipPath: "inset(10% 22% 10% 22% round 28px)" }, {
        clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
        scrollTrigger: { trigger: ".lg-window", start: "top 80%", end: "center center", scrub: true },
      });
      gsap.fromTo(".lg-window-frame img", { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".lg-window", start: "top 80%", end: "center center", scrub: true } });
      gsap.fromTo(".lg-window-caption", { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: "none", scrollTrigger: { trigger: ".lg-window", start: "center 70%", end: "center 40%", scrub: true } });
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  const go = (href: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToTarget(href, { offset: -24 }); };

  return (
    <div className="lg" ref={root}>
      <a className="skip-link" href="#book">Skip to booking</a>

      <section id="top" className="lg-hero" aria-label="Checkmate Stays — Pause where the hills begin" style={frameHeight ? { height: frameHeight } : undefined}>
        {webgl ? (
          <iframe ref={frameRef} className="lg-frame" src="/landing-pages/highlands.html" title="Checkmate Stays — Pause where the hills begin" />
        ) : (
          <div className="lg-fallback">
            <Stock name="foothills-mist" alt="Forested hills folding into mist below snow peaks" eager />
            <div className="lg-fallback-copy">
              <Wordmark className="lg-fallback-mark" />
              <h1>Pause where<br />the hills begin</h1>
              <p>Two suites in Charleville, Mussoorie, beneath a 200-year-old oak and the snow-capped Himalayas.</p>
              <button type="button" className="lg-liquid" onClick={focusBooking}><span>Book your stay</span></button>
            </div>
          </div>
        )}
      </section>

      <section id="book" className="lg-book" aria-labelledby="lg-book-h">
        <div className="lg-book-inner">
          <h2 id="lg-book-h">Book your stay</h2>
          <BookingWidget className="lg-bw" />
        </div>
      </section>

      <main>
        <section className="lg-window" aria-labelledby="lg-window-h">
          <div className="lg-window-frame"><Stock name="foothills-mist" alt="Forested hills folding into mist below snow peaks" /></div>
          <div className="lg-window-caption">
            <h2 id="lg-window-h">Time slows down.<br />Life feels lighter.</h2>
            <p>An oak at the heart of the garden, the Himalayas on the horizon, and nothing to do but rest.</p>
          </div>
        </section>

        <section id="suites" className="lg-suites" aria-labelledby="lg-suites-h">
          <header className="lg-head">
            <p className="lg-kicker" data-reveal>The suites</p>
            <h2 id="lg-suites-h" data-reveal>Two homes above the valley</h2>
          </header>
          <div className="lg-suite-cards">
            {SUITES.map((s, i) => {
              const open = openSuite === i;
              return (
                <article key={s.id} className={`lg-suite-card ${open ? "is-open" : ""}`} onMouseEnter={() => !compact && setOpenSuite(i)}>
                  <Stock name={i === 0 ? "green-suite" : "veranda-view"} alt={i === 0 ? "A timber living room facing the hills" : "An open veranda with a bed facing the mountains"} sizes="(max-width: 900px) 100vw, 60vw" />
                  <div className="lg-suite-body">
                    <h3>
                      <button type="button" aria-expanded={open} aria-controls={`suite-${s.id}`} onClick={() => setOpenSuite(i)} onFocus={() => setOpenSuite(i)}>{s.name}</button>
                    </h3>
                    <p className="lg-suite-short">{s.short}</p>
                    <div id={`suite-${s.id}`} className="lg-suite-more" hidden={!open}>
                      <ul>{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
                      <button type="button" className="lg-liquid lg-liquid--sm" onClick={focusBooking}><span>Check availability</span></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <FeatureShowcase variant="stack" className="lg-fs" reduced={reduced} images={{ 1: { img: "terrace-greenery", alt: "A wooden terrace among trees" } }} />
        </section>

        <section id="experiences" ref={expRef} className={`lg-exp ${pinRail ? "is-pinned" : ""}`} aria-labelledby="lg-exp-h">
          <header className="lg-exp-head">
            <div>
              <p className="lg-kicker">Experiences</p>
              <h2 id="lg-exp-h">Slow days,<br />starlit evenings</h2>
            </div>
            <div className="lg-exp-tabs">
              <DockTabs label="Jump to experiences" items={RAIL_TABS} active={railTab} onSelect={(i) => seq.goTo(RAIL_TABS[i].at)} reduced={reduced} />
              <p className="lg-exp-count" aria-hidden="true">{String(seq.active + 1).padStart(2, "0")} / {String(RAIL.length).padStart(2, "0")}</p>
            </div>
          </header>
          <div className="lg-rail-view">
            <ul className="lg-rail" ref={rail} tabIndex={pinRail ? undefined : 0} aria-label={pinRail ? "Experiences" : "Experiences, swipe sideways"}>
              {RAIL.map(({ id, img, alt }) => {
                const e = exp(id);
                return (
                  <li key={id} className="lg-rail-card">
                    <Stock name={img} alt={alt} sizes="(max-width: 760px) 80vw, 30vw" />
                    <div>
                      <p className="lg-rail-kind">{e.kind === "nearby" ? "Nearby" : "At Checkmate"}</p>
                      <h3>{e.title}</h3>
                      <p>{e.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section id="diary" className="lg-diary" aria-labelledby="lg-diary-h">
          <figure data-clip><Stock name="dal" alt="A bowl of dal beside rice" parallax={6} sizes="(max-width: 900px) 100vw, 55vw" /></figure>
          <div className="lg-diary-body">
            <p className="lg-kicker" data-reveal>Reservation-only café</p>
            <h2 id="lg-diary-h" data-reveal>{DIARY.title}</h2>
            <p data-reveal>Garhwali and Indian cuisine, locally sourced.</p>
            <ul>{DIARY.dishes.map((d) => <li key={d.name} data-reveal><strong>{d.name}</strong><span>{d.text}</span></li>)}</ul>
            <a className="lg-liquid" href={`tel:${SITE.diaryPhone.replace(/\s/g, "")}`}><span>Call {SITE.diaryPhone}</span></a>
          </div>
        </section>

        <section id="rooted" className="lg-rooted" aria-labelledby="lg-rooted-h">
          <figure className="lg-rooted-img" data-clip><Stock name="approach-clouds" alt="A mountainside rising above a sea of cloud" parallax={8} sizes="(max-width: 900px) 100vw, 40vw" /></figure>
          <div>
            <p className="lg-kicker" data-reveal>Our commitment</p>
            <h2 id="lg-rooted-h" data-reveal>Rooted in the hills</h2>
            <ol>
              {SUSTAINABILITY.map((s, i) => <li key={s.title} data-reveal><span>{String(i + 1).padStart(2, "0")}</span><strong>{s.title}</strong><em>{s.text}</em></li>)}
            </ol>
          </div>
        </section>

        <section className="lg-quote" aria-label="Guest words">
          <figure>
            <blockquote key={quote} aria-live="polite">“{GUEST_WORDS[quote].quote}”</blockquote>
            <figcaption>{GUEST_WORDS[quote].name}</figcaption>
          </figure>
          <div className="lg-quote-nav">
            {GUEST_WORDS.map((g, i) => (
              <button key={g.name} type="button" aria-label={`Show words from ${g.name}`} aria-pressed={quote === i} onClick={() => setQuote(i)} />
            ))}
          </div>
        </section>
      </main>

      <footer id="connect" className="lg-footer">
        <div className="lg-footer-inner">
          <section className="lg-footer-cta" aria-labelledby="lg-footer-h">
            <div>
              <p className="lg-kicker">Your retreat awaits</p>
              <h2 id="lg-footer-h">Come home to the hills.</h2>
              <p className="lg-footer-cta-sub">Two suites in Charleville, Mussoorie. Live rates and availability open in our booking engine.</p>
            </div>
            <div className="lg-footer-actions">
              <button type="button" className="lg-liquid" onClick={focusBooking}><span>Check availability</span></button>
              <a className="lg-footer-call" href={`tel:${SITE.phones[0].replace(/\s/g, "")}`}>or call {SITE.phones[0]}</a>
            </div>
          </section>

          <div className="lg-footer-grid">
            <div className="lg-footer-brand">
              <Wordmark className="lg-footer-mark" />
              <p>{SITE.tagline}</p>
              <address>{SITE.address}</address>
              <ul className="lg-footer-social">
                <li><a href={SITE.instagram} target="_blank" rel="noreferrer">Instagram</a></li>
                <li><a href={SITE.facebook} target="_blank" rel="noreferrer">Facebook</a></li>
              </ul>
            </div>
            <nav aria-label="Footer">
              <h3>Explore</h3>
              <ul>
                <li><a href="#suites" onClick={go("#suites")}>Suites</a></li>
                <li><a href="#experiences" onClick={go("#experiences")}>Experiences</a></li>
                <li><a href="#diary" onClick={go("#diary")}>Mussoorie Diary</a></li>
                <li><a href="#rooted" onClick={go("#rooted")}>Sustainability</a></li>
                <li><a href="#book" onClick={(e) => { e.preventDefault(); focusBooking(); }}>Book your stay</a></li>
              </ul>
            </nav>
            <div>
              <h3>Getting here</h3>
              <ul>{SITE.directions.map((d) => <li key={d.from}><strong>{d.from.split(",")[0]}</strong>{d.distance} · about {d.time}</li>)}</ul>
            </div>
            <div>
              <h3>Contact</h3>
              <ul>
                {SITE.phones.map((p) => <li key={p}><a href={`tel:${p.replace(/\s/g, "")}`}>{p}</a></li>)}
                <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
                <li><span className="lg-footer-note">Diary reservations</span><a href={`tel:${SITE.diaryPhone.replace(/\s/g, "")}`}>{SITE.diaryPhone}</a></li>
              </ul>
            </div>
          </div>

          <div className="lg-footer-base">
            <p><a href={SITE.policies.privacy}>Privacy policy</a> · <a href={SITE.policies.refund}>Refund & cancellation</a></p>
            <IllustrativeNote />
            <p className="lg-credit">Hero adapted from ThreeUI SylvaHero (MIT, verified revision 05f359ce157a): its layout, entrance, dock, liquid-metal controls and pixel reveals, over new photographic scenery.</p>
            <button type="button" className="lg-top" onClick={() => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })}>Back to top ↑</button>
          </div>
        </div>
      </footer>

      <div className="mobile-book lg-mobile-book" data-hidden={!pastHero}>
        <span>Checkmate · Mussoorie</span>
        <button type="button" onClick={focusBooking}>Book</button>
      </div>
      <ConceptSwitcher current="/concepts/highlands" />
    </div>
  );
}
