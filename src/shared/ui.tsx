import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import credits from "../data/stockCredits.json";
import { SITE } from "./content";

export type StockKey = keyof typeof credits;

/** Licensed stock photograph, served at two sizes. Always illustrative — never Checkmate's own property. */
export function Stock({ name, alt, className = "", sizes = "100vw", eager = false, style, parallax }: {
  name: StockKey; alt: string; className?: string; sizes?: string; eager?: boolean; style?: React.CSSProperties;
  /** Parallax travel in %, picked up by useImageMotion. */
  parallax?: number;
}) {
  const c = credits[name];
  return (
    <img
      className={className}
      src={`/stock/${name}-lg.webp`}
      srcSet={`/stock/${name}-sm.webp 900w, /stock/${name}-lg.webp ${c.width}w`}
      sizes={sizes}
      width={c.width}
      height={c.height}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      style={style}
      data-illustrative=""
      data-parallax={parallax}
    />
  );
}

/** The Checkmate wordmark (official artwork) used as a mask, so each concept can tint it. */
export function Wordmark({ className = "", label = SITE.name }: { className?: string; label?: string }) {
  return <span className={`wordmark ${className}`} role="img" aria-label={label} />;
}

export function IllustrativeNote({ className = "" }: { className?: string }) {
  return (
    <p className={`illustrative-note ${className}`}>
      Concept preview. Photography is licensed stock used for illustration only and does not depict Checkmate Stays.{" "}
      <Link to="/credits">Image credits</Link>
    </p>
  );
}

const CONCEPTS = [
  { to: "/concepts/ridgelight", n: "1", label: "Ridgelight" },
  { to: "/concepts/approach", n: "2", label: "Approach" },
  { to: "/concepts/checkmate", n: "3", label: "Checkmate" },
  { to: "/concepts/highlands", n: "4", label: "Highlands" },
];

/** Reviewer-only switcher for comparing concepts; not part of any design. */
export function ConceptSwitcher({ current }: { current: string }) {
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 120);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className="concept-switcher" aria-label="Design concepts" data-at-top={atTop}>
      <Link to="/" className="cs-home" aria-label="All concepts">◇</Link>
      {CONCEPTS.map((c) => (
        <Link key={c.to} to={c.to} aria-current={c.to === current ? "page" : undefined} title={c.label}>
          {c.n}<span className="cs-label"> {c.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function ContactBlock({ className = "" }: { className?: string }) {
  return (
    <address className={`contact-block ${className}`}>
      <p>{SITE.address}</p>
      <p>
        {SITE.phones.map((p, i) => (
          <span key={p}>{i > 0 && " · "}<a href={`tel:${p.replace(/\s/g, "")}`}>{p}</a></span>
        ))}
      </p>
      <p><a href={`mailto:${SITE.email}`}>{SITE.email}</a> · <a href={SITE.instagram} target="_blank" rel="noreferrer">{SITE.instagramHandle}</a></p>
    </address>
  );
}
