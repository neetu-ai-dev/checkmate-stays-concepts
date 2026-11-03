import { useEffect, useRef, useState } from "react";
import { BookingWidget } from "../../shared/BookingWidget";
import { RetreatPanel } from "../../shared/RetreatPanel";
import { FeatureShowcase } from "../../shared/FeatureShowcase";
import { DockTabs } from "../../shared/DockTabs";
import { DIARY, EXPERIENCES, GUEST_WORDS, INTRO, NAV, SITE, SUITES, SUSTAINABILITY } from "../../shared/content";
import { useKingCursor } from "../../shared/kingCursor";
import { ScrollTrigger, gsap, scrollToTarget, useIsCompact, useImageMotion, useLenis, useReducedMotion, useReveal } from "../../shared/motion";
import { ConceptSwitcher, ContactBlock, IllustrativeNote, Stock, Wordmark, type StockKey } from "../../shared/ui";
import { useDocumentTitle, useFonts } from "../../shared/useFonts";
import { ApproachScene } from "./approachScene";
import "./approach.css";

const seg = (p: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (p - a) / (b - a)));

/* Experiences as a board, after the Checkmate concept's "Every square, a different evening": each
   text square sits beside its photograph, alternating like a chessboard. */
const SQUARES: ({ img: StockKey; alt: string } | { exp: string })[] = [
  { exp: "stargazing" }, { img: "night-milkyway-peaks", alt: "The Milky Way over snow peaks" }, { exp: "bonfire" }, { img: "night-bonfire", alt: "A campfire under a starry sky" },
  { img: "approach-clouds", alt: "A grassy slope above a sea of cloud" }, { exp: "dalai-hills" }, { img: "rail-hilltown", alt: "A hill town spread across a ridge at sunset" }, { exp: "landour" },
  { exp: "board-games" }, { img: "rail-board-games", alt: "A board game laid out on a wooden table" }, { exp: "company-garden" }, { img: "rail-garden", alt: "A waterfall tumbling over rocks in a garden" },
];

function supportsWebGL() {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

export default function ApproachConcept() {
  useFonts("family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&family=Inter:wght@400;500;600");
  useDocumentTitle("Checkmate Stays — Concept 2 · Mountain Approach");
  useKingCursor({ fill: "#1d2630", stroke: "#f4f7fa", accent: "#c9774f" });
  const reduced = useReducedMotion();
  const compact = useIsCompact();
  useLenis(!reduced);
  const root = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const ui = useRef<HTMLDivElement>(null);
  const [webgl] = useState(supportsWebGL);
  const [pastIntro, setPastIntro] = useState(false);
  const [section, setSection] = useState(-1);
  useReveal(root, reduced);
  useImageMotion(root, reduced);

  useEffect(() => {
    const h = host.current, sec = intro.current, overlay = ui.current;
    if (!h || !sec || !overlay) return;
    const scene = webgl ? new ApproachScene(h, { compact, reduced }) : undefined;
    const paint = (p: number) => { scene?.setProgress(p); applyOverlays(overlay, p); };
    let tween: gsap.core.Tween | undefined;
    let st: ScrollTrigger | undefined;
    if (!reduced) {
      const state = { p: 0 };
      paint(0);
      // a long scrub smooths every wheel step into one continuous glide
      tween = gsap.to(state, {
        p: 1, ease: "none",
        scrollTrigger: { trigger: sec, start: "top top", end: "bottom bottom", scrub: compact ? 0.8 : 1.4 },
        onUpdate: () => paint(state.p),
      });
      st = ScrollTrigger.create({ trigger: sec, start: "bottom 104%", endTrigger: document.documentElement, end: "bottom bottom", onToggle: (self) => setPastIntro(self.isActive) });
    } else {
      paint(1);
    }
    return () => { tween?.scrollTrigger?.kill(); tween?.kill(); st?.kill(); scene?.dispose(); };
  }, [compact, reduced, webgl]);

  // the header tabs follow the section in view
  useEffect(() => {
    const triggers = NAV.map((n, i) => {
      const el = document.querySelector<HTMLElement>(n.href);
      return el && ScrollTrigger.create({ trigger: el, start: "top 50%", end: "bottom 50%", onToggle: (self) => { if (self.isActive) setSection(i); else setSection((s) => (s === i ? -1 : s)); } });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, []);

  const toWelcome = () => scrollToTarget("#welcome", { offset: 0 });
  const toBooking = () => {
    scrollToTarget(pastIntro ? "#book-final" : "#book", { offset: -110 });
    window.setTimeout(() => document.querySelector<HTMLElement>(`${pastIntro ? "#book-final" : "#book"} input`)?.focus({ preventScroll: true }), 900);
  };

  return (
    <div className="ap" ref={root}>
      <a className="skip-link" href="#welcome">Skip to content</a>
      <header className={`ap-header ${pastIntro ? "is-scrolled" : ""}`}>
        <a className="ap-logo" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }); }} aria-label="Checkmate Stays — back to top"><Wordmark /></a>
        <nav className="ap-nav" aria-label="Primary">
          <DockTabs label="Sections" items={NAV} active={section} onSelect={(i) => scrollToTarget(NAV[i].href, { offset: -72 })} reduced={reduced} />
        </nav>
        <div className="ap-actions">
          {!reduced && !pastIntro && <button type="button" className="ap-skip" onClick={toWelcome}>Skip the approach</button>}
          <button type="button" className="ap-reserve" onClick={toBooking}>Reserve</button>
        </div>
      </header>

      <section id="top" ref={intro} className={`ap-intro ${reduced ? "is-static" : ""}`} aria-label="The approach to Checkmate">
        <div className="ap-stage">
          <div className="ap-scene" ref={host} aria-hidden="true">
            {!webgl && <Stock name="approach-sunrise-huts" alt="" eager />}
          </div>
          <div className="ap-ui" ref={ui}>
            <div className="ap-ov ap-open" data-ov="open">
              <p className="ap-eyebrow">Charleville · Mussoorie · first light</p>
              <h1>The road up<br /><em>to Checkmate</em></h1>
              <p className="ap-cue" aria-hidden="true"><span />Scroll to approach</p>
            </div>
            <p className="ap-ov ap-caption" data-ov="c1">Above the valley, the snow-capped Himalayas.</p>
            <p className="ap-ov ap-caption" data-ov="c2">On the ridge, an old oak and two suites with a view.</p>
          </div>
          <p className="ap-tag">Illustrative 3D scene & imagery</p>
        </div>
      </section>

      <main>
        {/* the approach dissolves straight into this scene: the arrival, and the booking */}
        <section id="welcome" className="ap-welcome" aria-labelledby="ap-welcome-h">
          <div className="ap-welcome-bg"><Stock name="approach-meadow-cabin" alt="" parallax={6} /></div>
          <div className="ap-welcome-inner">
            <div className="ap-welcome-copy">
              <p className="ap-kicker" data-reveal>{SITE.kind}</p>
              <h2 id="ap-welcome-h" className="ap-arrived" data-reveal>You have arrived.</h2>
              <p className="ap-welcome-title" data-reveal>{INTRO.pauseTitle}</p>
              <p className="ap-welcome-lead" data-reveal>{INTRO.lead}</p>
            </div>
            <div className="ap-welcome-book" data-reveal>
              <RetreatPanel id="book" title={["Checkmate Stays", "Choose your days"]} cta="Check availability" />
            </div>
          </div>
        </section>

        <section id="suites" className="ap-suites" aria-labelledby="ap-suites-h">
          <header className="ap-head">
            <p className="ap-kicker" data-reveal>The suites</p>
            <h2 id="ap-suites-h" data-reveal>Two suites,<br /><em>one ridge.</em></h2>
          </header>
          <div className="ap-suite-grid">
            {SUITES.map((s, i) => (
              <article key={s.id} className="ap-suite" data-reveal>
                <figure data-clip><Stock name={i === 0 ? "approach-sunrise-huts" : "approach-terrace"} alt={i === 0 ? "Alpine huts at sunrise below jagged peaks" : "A terrace table looking out over a green valley"} parallax={5} sizes="(max-width: 900px) 100vw, 50vw" /></figure>
                <div className="ap-suite-body">
                  <p className="ap-num">{String(i + 1).padStart(2, "0")}</p>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <ul>{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
                </div>
              </article>
            ))}
          </div>
          <FeatureShowcase variant="rail" className="ap-fs" reduced={reduced} />
        </section>

        <section id="experiences" className="ap-exp" aria-labelledby="ap-exp-h">
          <header className="ap-head">
            <p className="ap-kicker" data-reveal>Experiences</p>
            <h2 id="ap-exp-h" data-reveal>Every square,<br /><em>a different day.</em></h2>
          </header>
          <ul className="ap-board">
            {SQUARES.map((sq, i) => {
              if ("img" in sq) return <li key={i} className="ap-sq ap-sq--img"><Stock name={sq.img} alt={sq.alt} sizes="(max-width: 760px) 50vw, 25vw" /></li>;
              const e = EXPERIENCES.find((x) => x.id === sq.exp)!;
              return (
                <li key={i} className="ap-sq ap-sq--text">
                  <p className="ap-sq-kind">{e.kind === "nearby" ? "Nearby" : "At Checkmate"}</p>
                  <h3>{e.title}</h3>
                  <p>{e.text}</p>
                </li>
              );
            })}
          </ul>
          <p className="ap-exp-more" data-reveal>
            Also nearby: {EXPERIENCES.filter((e) => e.kind === "nearby" && !SQUARES.some((s) => "exp" in s && s.exp === e.id)).map((e) => e.title).join(" · ")}
          </p>
        </section>

        <section id="diary" className="ap-diary" aria-labelledby="ap-diary-h">
          <figure data-clip><Stock name="dal" alt="A bowl of dal beside rice" parallax={6} sizes="(max-width: 900px) 100vw, 50vw" /></figure>
          <div>
            <p className="ap-kicker" data-reveal>{DIARY.subtitle}</p>
            <h2 id="ap-diary-h" data-reveal>{DIARY.title}</h2>
            <p data-reveal>{DIARY.text}</p>
            <ol>{DIARY.dishes.map((d) => <li key={d.name} data-reveal><strong>{d.name}</strong><span>{d.text}</span></li>)}</ol>
            <a className="ap-pill" href={`tel:${SITE.diaryPhone.replace(/\s/g, "")}`}>{DIARY.reservation} · {SITE.diaryPhone}</a>
          </div>
        </section>

        <section className="ap-care" aria-labelledby="ap-care-h">
          <h2 id="ap-care-h" data-reveal>Built with a deep respect for the Himalayas</h2>
          <ol>{SUSTAINABILITY.map((s, i) => <li key={s.title} data-reveal><span>{String(i + 1).padStart(2, "0")}</span><strong>{s.title}</strong><em>{s.text}</em></li>)}</ol>
        </section>

        <section className="ap-words" aria-label="Guest words">
          {GUEST_WORDS.map((g) => <figure key={g.name} data-reveal><blockquote>“{g.quote}”</blockquote><figcaption>— {g.name}</figcaption></figure>)}
        </section>

        <section id="connect" className="ap-close" aria-labelledby="ap-close-h">
          <div className="ap-close-bg"><Stock name="approach-sunrise-huts" alt="" parallax={8} /></div>
          <div className="ap-close-inner">
            <h2 id="ap-close-h" data-reveal>Make the climb.<br /><em>We’ll keep the lights on.</em></h2>
            <p data-reveal>{INTRO.retreat}</p>
            <BookingWidget id="book-final" layout="bar" className="ap-bw" submitLabel="Check availability" />
            <div className="ap-close-meta">
              <ContactBlock />
              <ul>{SITE.directions.map((d) => <li key={d.from}><strong>{d.time}</strong> · {d.distance} from {d.from}</li>)}</ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="ap-footer">
        <Wordmark className="ap-footer-mark" />
        <p>{SITE.tagline}</p>
        <p><a href={SITE.policies.privacy}>Privacy policy</a> · <a href={SITE.policies.refund}>Refund & cancellation</a> · <a href={SITE.instagram}>{SITE.instagramHandle}</a></p>
        <IllustrativeNote />
      </footer>

      <div className="mobile-book ap-mobile-book" data-hidden={!pastIntro}>
        <span>Charleville · Mussoorie</span>
        <button type="button" onClick={toBooking}>Reserve</button>
      </div>
      <ConceptSwitcher current="/concepts/approach" />
    </div>
  );
}

/** The opening title, the captions and the hand-over follow the same scroll clock as the camera. */
function applyOverlays(root: HTMLElement, p: number) {
  const set = (key: string, o: number, y = 0) => {
    const el = root.querySelector<HTMLElement>(`[data-ov="${key}"]`);
    if (!el) return;
    el.style.opacity = String(o);
    el.style.transform = `translate3d(0, ${y}px, 0)`;
    el.style.visibility = o < 0.01 ? "hidden" : "visible";
  };
  const open = 1 - seg(p, [0.03, 0.13]);
  set("open", open, -(1 - open) * 16);
  const win = (a: number, b: number) => Math.min(seg(p, [a, a + 0.07]), 1 - seg(p, [b - 0.07, b]));
  set("c1", win(0.1, 0.28), (1 - win(0.1, 0.28)) * 10);
  set("c2", win(0.29, 0.48), (1 - win(0.29, 0.48)) * 10);
  // the approach settles back and dims as the arrival slides up over it
  root.parentElement?.style.setProperty("--cover", String(seg(p, [0.55, 1])));
}
