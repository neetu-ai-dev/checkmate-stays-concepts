import { useRef } from "react";
import "./dock-tabs.css";

/* Tabs in the idiom of Concept Two's hero dock: a lit glass capsule of uppercase pills that
   magnify as the pointer nears them, a specular rim that points back at the pointer, and the
   current item wearing the cards' paper. Each page themes it through --dt-* properties. */

export function DockTabs({ items, active, onSelect, label, className = "", reduced = false }: {
  /** With href, an item is a link (for navigation); without, a button. */
  items: { label: string; key?: string; href?: string }[];
  active: number;
  onSelect: (i: number) => void;
  label: string;
  className?: string;
  reduced?: boolean;
}) {
  const bar = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = bar.current;
    if (!el || reduced || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--spec-angle", `${Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) + Math.PI / 2}rad`);
    el.style.setProperty("--spec-bright", "1");
    for (const pill of el.querySelectorAll<HTMLElement>(".dt-item")) {
      const p = pill.getBoundingClientRect();
      const d = Math.abs(e.clientX - (p.left + p.width / 2));
      const near = Math.max(0, 1 - d / 120);
      pill.style.setProperty("--mag", (1 + near * near * 0.16).toFixed(3));
      pill.dataset.near = String(near > 0.55);
    }
  };
  const onLeave = () => {
    const el = bar.current;
    if (!el) return;
    el.style.setProperty("--spec-bright", "0");
    for (const pill of el.querySelectorAll<HTMLElement>(".dt-item")) { pill.style.setProperty("--mag", "1"); pill.dataset.near = "false"; }
  };

  return (
    <div ref={bar} className={`dt ${className}`} role="group" aria-label={label} onPointerMove={onMove} onPointerLeave={onLeave}>
      {items.map((it, i) => {
        const common = { className: `dt-item ${active === i ? "is-active" : ""}`, "aria-current": active === i ? ("true" as const) : undefined };
        return it.href ? (
          <a key={it.key ?? it.label} href={it.href} {...common} onClick={(e) => { e.preventDefault(); onSelect(i); }}>{it.label}</a>
        ) : (
          <button key={it.key ?? it.label} type="button" {...common} onClick={() => onSelect(i)}>{it.label}</button>
        );
      })}
    </div>
  );
}
