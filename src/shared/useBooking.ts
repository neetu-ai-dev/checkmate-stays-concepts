import { useMemo, useState, type FormEvent } from "react";
import { addDays, buildBookingUrl, isoDate, nightsBetween, openBooking } from "./booking";

/** Date and guest state shared by every booking surface, so they all deep-link the same way. */
export function useBooking() {
  const today = useMemo(() => isoDate(new Date()), []);
  const [checkin, setCheckinRaw] = useState(() => addDays(today, 14));
  const [checkout, setCheckout] = useState(() => addDays(today, 16));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const nights = nightsBetween(checkin, checkout);
  const valid = !!checkin && !!checkout && checkin >= today && nights > 0;
  const query = { checkin, checkout, adults, children };

  const setCheckin = (v: string) => {
    setCheckinRaw(v);
    if (v && nightsBetween(v, checkout) < 1) setCheckout(addDays(v, 1));
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (valid) openBooking(query);
  };

  return {
    today, checkin, checkout, adults, children, nights, valid,
    setCheckin, setCheckout, setAdults, setChildren, submit,
    minCheckout: addDays(checkin || today, 1),
    url: valid ? buildBookingUrl(query) : undefined,
  };
}

export function formatShort(iso: string) {
  if (!iso) return "Select";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
