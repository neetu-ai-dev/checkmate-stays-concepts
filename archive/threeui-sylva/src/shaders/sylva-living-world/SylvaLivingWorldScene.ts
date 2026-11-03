/* Checkmate Stays shim — NOT ThreeUI source. The registered LandingPages.tsx is the whole
   catalog module and imports sibling scenes that are outside the SylvaHero registration.
   Only SylvaHero (living-green) is used in this project, so these seams are stubbed the way
   ThreeUI's own public build stubs its Pro builders. */
/* The derived Sylva variants (sakura-sunset, maple-autumn, sequoia-mist) need ThreeUI's
   SylvaLivingWorldScene transforms, which are not in the registration. Living Green is served
   byte-for-byte from /landing-pages/inner-green-3d.html and never calls these. */
const notRegistered = (): string => {
  throw new Error("Only the living-green SylvaHero variant is vendored in this project.");
};
export const SAKURA_SUNSET_STYLE = "";
export const MAPLE_AUTUMN_STYLE = "";
export const SEQUOIA_MIST_STYLE = "";
export const applySakuraSunsetVariant: (source: string) => string = notRegistered;
export const applyMapleAutumnVariant: (source: string) => string = notRegistered;
export const applySequoiaMistVariant: (source: string) => string = notRegistered;
