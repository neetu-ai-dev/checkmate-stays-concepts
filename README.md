# Checkmate Stays — four homepage concepts

Working homepage concepts for [checkmatestays.com](https://www.checkmatestays.com/), a boutique homestay in Charleville, Mussoorie. Built with Vite, React, TypeScript, Three.js, GSAP with ScrollTrigger, Lenis, and (for shadcn-style components) Tailwind CSS v4 and framer-motion.

```bash
npm install
npm run dev                          # http://localhost:5180
npm run build && npm run preview     # production build on http://localhost:5181
node scripts/derive-highlands.mjs    # rebuild the Highlands hero document from the verified SylvaHero source
node scripts/make-depth.mjs          # rebuild the Highlands depth map from its dawn photograph
npm run verify:threeui               # re-check the archived SylvaHero source hashes
```

| Route | Concept |
| --- | --- |
| `/` | Hub, to compare the four concepts |
| `/concepts/ridgelight` | 1 · Ridgelight: a full day from morning to night, driven by scroll, with ridgeline image frames (`/concepts/winterline` redirects here) |
| `/concepts/approach` | 2 · Mountain Approach: a slow glide up the valley that hands straight to the arrival scene |
| `/concepts/checkmate` | 3 · Checkmate: opens on the board one move from mate; booking follows in the next section |
| `/concepts/highlands` | 4 · Highlands: the SylvaHero experience over a depth-mapped dawn photograph (`/concepts/living-green` redirects here) |
| `/credits` | Stock image sources and licences |

Night Watch (an earlier concept) has been retired. Its code is in `archive/night-watch/`, and `/concepts/night-watch` returns to the hub. The concepts are numbered by position: Ridgelight 1, Mountain Approach 2, Checkmate 3 and Highlands 4 (reordered 2026-11-03). Their URLs never change, so shared links keep working.

## shadcn-style components (Tailwind)

The project was not set up for shadcn, so this round added the structure it expects, scoped so the four concepts are unaffected:

- **Folders:** `src/components/ui/` is the shadcn default component path, and `src/lib/utils.ts` holds `cn()`.
  - `components.json` points the shadcn CLI there, so `npx shadcn@latest add <component>` installs into the right place.
  - Keeping third-party UI there separates copied-in, regenerable components from the hand-written concept code in `src/concepts` and `src/shared`.
- **Alias:** `@/` resolves to `src/` in `vite.config.ts` and `tsconfig.json`, the alias shadcn components import from.
- **Tailwind v4** (`@tailwindcss/vite`, `src/styles/tailwind.css`):
  - The global preflight reset is not loaded.
  - Utilities are generated only from `src/components/ui`.
  - Everything sits in cascade layers, so the concepts' unlayered CSS always wins.
  - The shared element resets in `base.css` moved into `@layer base`, beneath the utilities.
  - A build check confirmed the 113 generated utilities collide with no concept class name.
- **`src/components/ui/perspective-tunnel-hero.tsx`** is the supplied 21st.dev component, with framer-motion. Its source defaults still render the original demo. Changes:
  - content arrives as props;
  - an optional `progress` lets page scroll drive it, and the original wheel mode is kept but no longer traps the wheel at either end;
  - it is themed through `--tunnel-*` variables;
  - `w-full` replaces `w-screen`, which overflowed;
  - reduced motion gets a still grid.

## Booking

Every booking surface uses `src/shared/useBooking.ts` and opens the live engine's availability search (`letsbook.me/booking/checkmate`, with `checkin`, `checkout`, `adults` and `children`) in a new tab. Nothing is reserved without completing checkout there.

## Shared systems

- **Evolving chess cursor** (`src/shared/kingCursor.ts`)
  - Page progress walks it pawn → knight → bishop → rook → queen, and scrolling back reverses it.
  - It is the browser's native cursor (25 cached cross-fade frames, hotspot at the top tip), for fine pointers only. Highlands forwards it into its hero document.
- **Scroll-driven horizontal sequences** (`src/shared/scrollRail.ts`)
  - On wide screens the section pins, and vertical scroll moves the track sideways one pixel per pixel, then releases into the next section. Nothing moves on a timer, and scrolling up reverses it.
  - On phones and under reduced motion it is a swipeable, snapping row.
  - It reports the item in focus through a probe that slides across the view, so the last items get their turn, and it can scroll any item into focus.
  - Used by the Highlands experiences and Approach's suite features. The earlier autoplay rail is archived in `archive/autoplay-rail/`.
- **Dock tabs** (`src/shared/DockTabs.tsx`)
  - The Highlands hero dock as a reusable control: a lit capsule, pills that magnify near the pointer, a specular rim aimed at the pointer, and the current item in card paper.
  - Highlands uses it on its experiences sequence. Approach uses it, recoloured, for its header navigation (marks the section in view) and its feature sequence.
- **Feature showcase** (`src/shared/FeatureShowcase.tsx`)
  - "In every suite", image-led: mosaic (1), stack (2), split (4) and the scroll-driven rail (5).
- **Retreat kit** (`src/shared/three/retreatKit.ts`)
  - The house, oak, pines, ridge textures and seeded noise shared by Approach and Ridgelight.
  - Pines carry per-instance colour drift, so a stand reads as many trees. Ridge snow is drawn per pixel column along the interpolated ridge, so steep faces no longer stair-step.
  - `smoothDamp`: a critically damped move for cameras (eases in and out, stays continuous if the target changes mid-move).

## Concept notes

**1 · Ridgelight: expressive image frames, the evening tunnel, a softened world.**
- **Review pass (round 6):** the camera now smooth-damps between chapter waypoints (about 3.5 s, eased both ends) instead of an exponential lerp that started abruptly. The post-opening blur is 4 px rather than 7, so the day, the lamps and the stars stay legible behind the copy; stars are a touch larger to survive it. The far ridge's stepped snow edge is fixed in the kit.
- **After Dark:** the mixed image-and-text cards are replaced by the perspective tunnel.
  - A sticky stage in a 3-screen track: page scroll (not the wheel) flies nine evening photographs past the title, which is set in Ridgelight's Onest and Instrument Serif with ember accents.
  - The three experiences follow in one consistent text row.
  - It is memoised, so the header clock's re-renders skip it. Phones fly six cards without shadows.
- **Background softening:** past the opening, the 3D world, and only that layer, blurs gradually to 7 px with a light veil, then clears again on the way back up. Phones get the veil alone.
- **Frames:** every photograph sits in a ridgeline frame (`RidgeFrame.tsx`). It is an asymmetric percentage polygon whose top edge is a soft mountain ridge, with differently rounded base corners per image, so the frames read as one family.
- **Reveal:** the ridge rises with scroll to uncover each image while the photo settles back from a slight zoom. Under reduced motion the frames show whole.
- **The House:** the gallery is re-cast as a staggered room, window and balcony set (better-fitting photos with chosen focal points), plus a short caption from the verified suite features.
- **Elsewhere:** the After Dark cards and the diary photo use the same frames.

**2 · Mountain Approach: a calmer arrival.**
- **Review pass (round 6):** the range is built from tall massifs with lower saddles (sky and farther peaks show through) with snow only on the upper peaks and rock beneath, instead of a uniform white wall; the sky has a blue zenith and warm horizon so snow reads against it; the sun comes from the right and slightly in front, giving the slopes and the house light and shade; the cloud sea now lies in the valley between the viewer and the range and dissolves at its foot (it had sat under the opening camera and read as a band cutting the range); meadows mix two tones by noise and darken on steep ground; haze fades into the horizon colour rather than grey.
- **Opening:** subtler and shorter. The camera eases in and out along a lower path and turns slightly round the house instead of orbiting into a close-up. The scrub is longer, so wheel steps blend into one glide.
- **Grade:** sage meadows, muted conifers, a warmer low sun, a softer sky and lighter haze.
- **Typography:** Newsreader (an optical-size reading serif) and Inter replace Bodoni Moda and Manrope, with larger body text and darker secondary text.
- **Arrival:** the hand-off frame is gone. The "A space to pause…" scene slides up over the dimming approach, carrying "You have arrived." as the main heading, the line beneath it, and the booking panel on the right (stacked on phones).
- **Header:** navigation uses the Highlands dock tabs.
- **Rail:** the suite features run as a scroll-driven sequence with dock tabs.
- **Experiences:** now use Checkmate's board (text squares beside their photographs, the same hover behaviour), set in Approach's type and colours.

**3 · Checkmate: shorter opening.**
- **Opening:** the page now opens at the mating net, just before the checkmate frame. A 1.9 s entrance fades the board up while the camera finishes easing back from the king.
- **Scroll:** about 1.5 screens of scroll (previously 2.8) play Qg7#, the toppling king, "Checkmate", and the queen's silhouette opening onto the retreat and hero.
- **Booking:** there is no booking panel over the chess scene. The reference-styled panel now sits in the first hospitality section ("A space to pause…"), and the header's "Book now" goes there.

**4 · Highlands: realistic scenery, a proportionate footer.**
- **Review pass (round 6):** the contour light is softer and warmer (wider, smoothstepped lines that are barely there away from the pointer), the survey pulse is a broad soft wave rather than sharp rings, and a faint warm rim now catches ridge crests where they meet the haze behind them.
- **Footer:** the full-width wordmark is gone. It is now:
  - a booking band on a dimmed crop of the hero photo ("Check availability", or call);
  - a compact wordmark with tagline, address and socials;
  - Explore, Getting here and Contact columns, all verified details;
  - a slim base row with policies, the illustrative note, the source credit and Back to top.
  - On phones it stacks into two columns.
- **Footer booking:** the button now waits for the scroll to land before focusing the date field (it used to cut long scrolls short). The hero keeps the restored SylvaHero layout, entrance, dock, liquid-metal controls and pixel-reveal cards.
- **Scenery:** a photograph replaces the procedural range. It shows layered Himalayan foothills at dawn (licensed stock) with a depth map derived from its aerial haze (`scripts/make-depth.mjs`).
- **Effects on the photograph's depth:** pointer parallax, the amber contour light (iso-depth lines that trace the real ridges), the arrival and click survey pulse, valley mist coloured from the photo, warm motes and distant birds.
- **Grade:** slate in the shadows, warm stone in the highlights, a light desaturation, and a graduated filter that deepens the upper sky so the headline reads.
- **Experiences:** a scroll-driven sequence with dock tabs (At Checkmate / Walks & water / Town & temple).
- **Performance:** one shader pass plus motes and birds, about 18 draw calls a frame, and p95 17 ms at 60 Hz with no long tasks. Every loop parks while the hero is off-screen.

## Imagery

- **Licence:** all photography is Unsplash stock under the [Unsplash License](https://unsplash.com/license). It is illustrative and does not depict Checkmate Stays. Pages label it as such, and sources are listed at `/credits` (`src/data/stockCredits.json`, 39 images in use).
- **New this round:** `highlands-dawn` (Highlands hero) and `house-balcony` (Ridgelight).
- **Unused images:** images no longer used by any page are kept, with their credits, in `archive/stock-unused/`.

Business copy comes only from the live site; guest quotes are verbatim.

## Testing (production build)

- **`scripts/dev/interact.mjs`:** 83/83 checks pass. They cover:
  - the hub (concepts in order) and the retired Night Watch redirect;
  - Checkmate's short opening, no booking in the scene, Skip and Book now;
  - the Highlands hero controls and parking;
  - for both pinned sequences: pin, sideways travel, no timed autoplay, a clean release with no overlap, and tabs;
  - the swipeable fallbacks on phones and under reduced motion;
  - Ridgelight's frame reveal and its day clock;
  - Approach's hand-off into the arrival scene with booking on the right, its header tabs and its board;
  - every booking deep-link (with `window.open` stubbed);
  - the cursor journey;
  - full-page image sweeps;
  - phone overflow scans;
  - the Highlands footer scale and booking action;
  - Ridgelight's tunnel (cards fly with page scroll, the wheel is never captured, a still grid under reduced motion);
  - the background blur (in, out, background only, veil on phones).
- **`scripts/dev/scrollperf.mjs`:** frame pacing during continuous wheel scrolling.
  - Ridgelight measures the same with the blur on or off on desktop, and the tunnel adds little on phones.
- **`scripts/dev/track.mjs`:** screenshots a sticky scroll track at fractions of its travel.
- **`scripts/dev/pin.mjs`:** screenshots a pinned section along its travel and checks its release.
- **`scripts/dev/profile.mjs`:** frame pacing and draw calls in view and off-screen.
- **Screenshots:** in `screenshots/` at 390, 768, 1440, 2560 and 3840 px. The previous round's set is in `archive/screenshots-round3/`.

## Known limitations

- **Browsers:** testing was done in Chrome only (desktop GPU and emulated mobile). Safari and Firefox were not tested, and frame rates were not measured on a real low-end phone.
- **Highlands hero:** the authored SylvaHero layout stops scaling past 1900 px, so it sits centred on very wide screens. The depth map is estimated from haze rather than measured, so parallax at ridge edges is gentle by design.
- **Approach rail:** the pinned features rail is clipped at the page margins rather than bleeding to the screen edge.
- **Bundle size:** Three.js is a 132 KB gzipped shared chunk, loaded only on concept routes.
- **Before launch:** the stock photography needs replacing with real property photos.
