import { useRef, useState } from "react";
import { SUITE_FEATURES } from "./content";
import { Stock, type StockKey } from "./ui";
import { useScrollRail } from "./scrollRail";
import { useIsCompact } from "./motion";
import { DockTabs } from "./DockTabs";
import "./feature-showcase.css";

/* "In every suite" — the six verified suite features, image-led. Each concept picks a
   composition so no two pages repeat a layout:
   mosaic (asymmetric grid) · rail (horizontal, driven by vertical scroll) · aperture (circular viewports)
   · split (list drives a large image) · stack (staggered editorial rows). */

export type FeatureVariant = "mosaic" | "rail" | "aperture" | "split" | "stack";

const DEFAULT_IMAGES: { img: StockKey; alt: string }[] = [
  { img: "feat-bedroom", alt: "A bedroom window framing mountains at dusk" },
  { img: "feat-balcony", alt: "Open doors onto a terrace and a mountain view" },
  { img: "feat-living", alt: "Lounge chairs facing a wall of windows and peaks" },
  { img: "feat-kitchen", alt: "A warm timber kitchen" },
  { img: "feat-roof", alt: "A house with a wave-shaped roof among mountains" },
  { img: "hearth", alt: "Flames in a fireplace" },
];
/** Short names for the rail's tabs, in SUITE_FEATURES order. */
const TAB_LABELS = ["Bedrooms", "Balcony", "Living room", "Kitchen", "Roof", "Climate"];

type Props = {
  variant: FeatureVariant;
  className?: string;
  title?: string;
  reduced?: boolean;
  /** Replace individual photographs (by feature index) where a page already uses one. */
  images?: Partial<Record<number, { img: StockKey; alt: string }>>;
  /** Extra attributes for each card, e.g. data-cursor for Night Watch's halo. */
  cardAttrs?: Record<string, string>;
};

export function FeatureShowcase({ variant, className = "", title = "In every suite", reduced = false, images = {}, cardAttrs = {} }: Props) {
  const items = SUITE_FEATURES.map((f, i) => ({ ...f, ...(images[i] ?? DEFAULT_IMAGES[i]), n: i + 1 }));
  const [active, setActive] = useState(0);
  const railRoot = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLUListElement>(null);
  const compact = useIsCompact();
  const pinRail = variant === "rail" && !reduced && !compact;
  const seq = useScrollRail(railRoot, rail, { pinned: pinRail });

  if (variant === "split") {
    return (
      <div className={`fs fs--split ${className}`}>
        <div className="fs-split-list">
          <p className="fs-title">{title}</p>
          <ul>
            {items.map((f, i) => (
              <li key={f.title}>
                <button type="button" aria-pressed={active === i} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)} {...cardAttrs}>
                  <span className="fs-n">{String(f.n).padStart(2, "0")}</span>
                  <span className="fs-split-t">{f.title}</span>
                  <span className="fs-split-d">{f.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="fs-split-media" aria-live="polite">
          {items.map((f, i) => (
            <figure key={f.title} className={active === i ? "is-active" : ""} aria-hidden={active !== i}>
              <Stock name={f.img} alt={f.alt} sizes="(max-width: 900px) 100vw, 55vw" />
              <figcaption>{f.title}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "rail") {
    return (
      <div ref={railRoot} className={`fs fs--rail ${pinRail ? "is-pinned" : ""} ${className}`}>
        <div className="fs-rail-head">
          <p className="fs-title">{title}</p>
          <DockTabs label={`${title}: jump to a feature`} items={items.map((f, i) => ({ label: TAB_LABELS[i] ?? f.title }))} active={seq.active} onSelect={seq.goTo} reduced={reduced} />
        </div>
        <ul className="fs-rail" ref={rail} tabIndex={pinRail ? undefined : 0} aria-label={pinRail ? title : `${title}, swipe sideways`}>
          {items.map((f) => (
            <li key={f.title} className="fs-card" {...cardAttrs}>
              <figure><Stock name={f.img} alt={f.alt} sizes="(max-width: 760px) 78vw, 26vw" /></figure>
              <div className="fs-card-body">
                <span className="fs-n">{String(f.n).padStart(2, "0")}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={`fs fs--${variant} ${className}`}>
      <p className="fs-title" data-reveal>{title}</p>
      <ul className="fs-grid">
        {items.map((f) => (
          <li key={f.title} className="fs-card" data-reveal {...cardAttrs}>
            <figure data-clip={variant === "stack" ? "" : undefined}>
              <Stock name={f.img} alt={f.alt} parallax={variant === "stack" ? 6 : undefined} sizes={variant === "mosaic" ? "(max-width: 760px) 100vw, 45vw" : "(max-width: 760px) 100vw, 33vw"} />
            </figure>
            <div className="fs-card-body">
              <span className="fs-n">{variant === "mosaic" ? `${f.n}.` : String(f.n).padStart(2, "0")}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
