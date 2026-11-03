import { useId } from "react";
import { useBooking } from "./useBooking";
import "./booking-widget.css";

type Props = {
  /** "bar" lays fields in a row on wide screens; "card" always stacks. */
  layout?: "bar" | "card";
  title?: string;
  submitLabel?: string;
  className?: string;
  id?: string;
  /** Optional line under the fields that reacts to the chosen dates. */
  hint?: (checkin: string, checkout: string) => string | null;
};

export function Stepper({ label, value, min, max, onChange, className = "bw-field bw-field--stepper" }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; className?: string }) {
  const id = useId();
  return (
    <div className={className} role="group" aria-labelledby={id}>
      <span className="bw-label" id={id}>{label}</span>
      <div className="bw-stepper">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

export function BookingWidget({ layout = "bar", title, submitLabel = "Check availability", className = "", id, hint }: Props) {
  const b = useBooking();
  const uid = useId();
  const note = hint?.(b.checkin, b.checkout);

  return (
    <form id={id} className={`bw bw--${layout} ${className}`} onSubmit={b.submit} aria-label="Check availability" data-booking-url={b.url}>
      {title && <p className="bw-title">{title}</p>}
      <div className="bw-fields">
        <label className="bw-field" htmlFor={`${uid}-in`}>
          <span className="bw-label">Check-in</span>
          <input id={`${uid}-in`} type="date" min={b.today} value={b.checkin} required onChange={(e) => b.setCheckin(e.target.value)} />
        </label>
        <label className="bw-field" htmlFor={`${uid}-out`}>
          <span className="bw-label">Check-out</span>
          <input id={`${uid}-out`} type="date" min={b.minCheckout} value={b.checkout} required onChange={(e) => b.setCheckout(e.target.value)} />
        </label>
        <Stepper label="Adults" value={b.adults} min={1} max={8} onChange={b.setAdults} />
        <Stepper label="Children" value={b.children} min={0} max={6} onChange={b.setChildren} />
        <button className="bw-submit" type="submit" disabled={!b.valid}>
          <span>{submitLabel}</span>
          <span className="bw-nights" aria-hidden="true">{b.valid ? `${b.nights} night${b.nights > 1 ? "s" : ""}` : "Choose dates"}</span>
        </button>
      </div>
      {note && <p className="bw-hint" aria-live="polite">{note}</p>}
      <p className="bw-note">Opens the Checkmate Stays booking engine in a new tab · live rates & availability</p>
    </form>
  );
}
