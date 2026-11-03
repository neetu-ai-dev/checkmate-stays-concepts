import { useId, useRef } from "react";
import { formatShort, useBooking } from "./useBooking";
import "./retreat-panel.css";

/* Compact glass booking panel, proportioned on the supplied reference: two-line title,
   paired date pills, a dark inset row, a summary row and a full-width light CTA.
   The reference's check-in times and nightly price are not published by Checkmate Stays,
   so the inset holds guests and the summary shows nights instead. */

const Calendar = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3.2" width="12" height="10.6" rx="2" /><path d="M2 6.6h12M5.2 1.8v2.6M10.8 1.8v2.6" /></svg>
);
const Chevron = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6.2 3.5 3.6 3.5-3.6" /></svg>;

function DatePill({ label, value, min, onChange }: { label: string; value: string; min: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const open = () => { try { input.current?.showPicker?.(); } catch { /* picker needs a user gesture */ } };
  return (
    <label className="rp-pill" onClick={open}>
      <Calendar />
      <span className="rp-pill-value">{formatShort(value)}</span>
      <Chevron />
      <input
        ref={input}
        className="rp-date"
        type="date"
        aria-label={label}
        min={min}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
      />
    </label>
  );
}

function Count({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="rp-count" role="group" aria-labelledby={id}>
      <span className="rp-k" id={id}>{label}</span>
      <div className="rp-count-row">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

export function RetreatPanel({ id, className = "", title = ["Checkmate Stays", "Charleville, Mussoorie"], cta = "Reserve" }: { id?: string; className?: string; title?: [string, string]; cta?: string }) {
  const b = useBooking();
  return (
    <form id={id} className={`rp ${className}`} onSubmit={b.submit} aria-label="Book your stay" data-booking-url={b.url}>
      <p className="rp-title">{title[0]}<br />{title[1]}</p>
      <div className="rp-dates">
        <DatePill label="Check-in date" value={b.checkin} min={b.today} onChange={b.setCheckin} />
        <DatePill label="Check-out date" value={b.checkout} min={b.minCheckout} onChange={b.setCheckout} />
      </div>
      <div className="rp-inset">
        <Count label="Adults" value={b.adults} min={1} max={8} onChange={b.setAdults} />
        <span className="rp-divider" aria-hidden="true" />
        <Count label="Children" value={b.children} min={0} max={6} onChange={b.setChildren} />
      </div>
      <div className="rp-summary">
        <p className="rp-big">{b.valid ? b.nights : "–"}<span>{b.nights === 1 ? " night" : " nights"}</span></p>
        <p className="rp-small">Two-bedroom suites</p>
      </div>
      <button className="rp-cta" type="submit" disabled={!b.valid}>{cta}</button>
      <p className="rp-note">Live rates & availability open in a new tab</p>
    </form>
  );
}
