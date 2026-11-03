/* The live site's booking entry is the eZee/ipms247 engine, which resolves to letsbook.me.
   letsbook.me honours checkin / checkout / adults / children query parameters (verified
   30 Oct 2026); the ipms247 entry URL drops them, so searches deep-link to letsbook.me. */

export const BOOKING_ENTRY_URL = "https://live.ipms247.com/booking/book-rooms-checkmate";
const BOOKING_SEARCH_URL = "https://letsbook.me/booking/checkmate";

export type BookingQuery = { checkin: string; checkout: string; adults: number; children: number };

export function buildBookingUrl(q: BookingQuery) {
  const params = new URLSearchParams({
    checkin: q.checkin,
    checkout: q.checkout,
    adults: String(q.adults),
    children: String(q.children),
  });
  return `${BOOKING_SEARCH_URL}?${params}`;
}

export function isoDate(d: Date) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function nightsBetween(checkin: string, checkout: string) {
  const ms = new Date(`${checkout}T12:00:00`).getTime() - new Date(`${checkin}T12:00:00`).getTime();
  return Math.round(ms / 86400000);
}

/** Opens the booking engine's availability search. Nothing is reserved until the guest completes checkout there. */
export function openBooking(q?: BookingQuery) {
  const url = q ? buildBookingUrl(q) : BOOKING_ENTRY_URL;
  window.open(url, "_blank", "noopener");
  return url;
}
