/* Checkmate Stays shim — NOT ThreeUI source. The registered LandingPages.tsx is the whole
   catalog module and imports sibling scenes that are outside the SylvaHero registration.
   Only SylvaHero (living-green) is used in this project, so these seams are stubbed the way
   ThreeUI's own public build stubs its Pro builders. */
export function buildAsciiFieldDocument() {
  throw new Error("AsciiPageTransitionHero is not part of the SylvaHero registration.");
}
