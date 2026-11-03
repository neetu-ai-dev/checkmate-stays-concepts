/* Checkmate Stays shim — NOT ThreeUI source. The registered LandingPages.tsx is the whole
   catalog module and imports sibling scenes that are outside the SylvaHero registration.
   Only SylvaHero (living-green) is used in this project, so these seams are stubbed the way
   ThreeUI's own public build stubs its Pro builders. */
export const NOCTURNE_VARIANTS = ["midnight"] as const;
export type NocturneVariant = (typeof NOCTURNE_VARIANTS)[number];
export const NOCTURNE_TITLES: Record<NocturneVariant, string> = { midnight: "Nocturne" };
export function buildNocturneDocument(_variant: NocturneVariant): string {
  throw new Error("NocturneHero is not part of the SylvaHero registration.");
}
