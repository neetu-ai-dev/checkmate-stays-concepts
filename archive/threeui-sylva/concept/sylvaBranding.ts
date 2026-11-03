import { kingCursorCss } from "../../shared/kingCursor";

/* Checkmate copy for the SylvaHero frame, applied through the component's supported
   `applyScene(frame)` hook. The registered files stay byte-exact on disk; this only edits
   text nodes and labels in the live document after it loads, re-points the authored
   controls at this page, and adds the king cursor. Layout, shaders, motion and the
   liquid-metal controls are untouched. Every fact used here is from checkmatestays.com. */

export type SylvaActions = {
  book: () => void;
  goTo: (selector: string) => void;
  onLayout: (height: number | null) => void;
};

const KING_MARK =
  '<path d="M10 0.8h2v2.4h2.3v2H12v2.6h-2V5.2H7.7v-2H10z"/><path d="M4.6 8.6C8.6 6.8 13.4 6.8 17.4 8.6l-1.6 5H6.2z"/><rect x="5.6" y="13.6" width="10.8" height="1.9" rx=".9"/><path d="M7.4 15.5h7.2l1.5 5.4H5.9z"/><path d="M3.6 21h14.8v2.2H3.6z"/>';

function text(root: ParentNode, selector: string, value: string, index = 0) {
  const el = root.querySelectorAll<HTMLElement>(selector)[index];
  if (el) el.textContent = value;
  return el;
}

function on(el: Element | null | undefined, handler: () => void) {
  el?.addEventListener("click", (e) => {
    e.preventDefault();
    handler();
  });
}

export function brandSylvaFrame(frame: HTMLIFrameElement, actions: SylvaActions, cursor: Parameters<typeof kingCursorCss>[0]) {
  const doc = frame.contentDocument;
  // the first call can land on the initial about:blank document
  if (!doc || !doc.querySelector(".headline")) return;
  if (doc.documentElement.dataset.checkmate === "applied") return;
  doc.documentElement.dataset.checkmate = "applied";

  doc.title = "Checkmate Stays — Living Green";

  // dock
  const mark = doc.querySelector<HTMLAnchorElement>(".dock-mark");
  if (mark) {
    mark.setAttribute("aria-label", "Checkmate Stays — home");
    const svg = mark.querySelector("svg");
    if (svg) svg.innerHTML = KING_MARK;
    on(mark, () => actions.goTo("#top"));
  }
  const dock = [...doc.querySelectorAll<HTMLAnchorElement>(".dock-item:not(.dock-mark)")];
  const dockTargets: [string, () => void][] = [
    ["Suites", () => actions.goTo("#suites")],
    ["Experiences", () => actions.goTo("#experiences")],
    ["Diary", () => actions.goTo("#diary")],
    ["Book", actions.book],
  ];
  dock.forEach((a, i) => {
    const [label, go] = dockTargets[i] ?? [];
    if (!label) return;
    const spans = a.querySelectorAll(":scope > span");
    const lbl = spans[spans.length - 1];
    if (lbl) lbl.textContent = label;
    on(a, go);
  });

  // headline, lede, ghost word
  const lines = doc.querySelectorAll<HTMLElement>(".headline > span > i");
  if (lines[0]) lines[0].textContent = "Pause beneath";
  if (lines[1]) lines[1].textContent = "the old oak";
  text(doc, ".lede", "Two suites in Charleville, Mussoorie, beneath a 200-year-old oak and the snow-capped Himalayas.");
  text(doc, ".ghost", "OAK");

  // the two native liquid-metal controls
  const explore = doc.querySelector<HTMLButtonElement>(".liquid-button--explore");
  if (explore) {
    const lbl = explore.querySelector(".lbl");
    if (lbl) lbl.textContent = "Book your stay";
    on(explore, actions.book);
  }
  const play = doc.querySelector<HTMLButtonElement>(".liquid-button--play");
  if (play) {
    play.setAttribute("aria-label", "Discover the suites");
    const ico = play.querySelector("svg.ico");
    if (ico) ico.innerHTML = '<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    on(play, () => actions.goTo("#suites"));
  }

  // stats: verified figures only
  const stats = doc.querySelectorAll<HTMLElement>(".stat");
  const facts = [["Private L-shaped balcony", "5 m wide"], ["From Dehradun airport", "62 km"]];
  stats.forEach((s, i) => {
    const f = facts[i];
    if (!f) return;
    const dt = s.querySelector("dt"), dd = s.querySelector("dd");
    if (dt) dt.textContent = f[0];
    if (dd) dd.textContent = f[1];
  });

  // cards
  const about = doc.querySelector(".card--about");
  if (about) {
    text(about, ".label", "Our commitment");
    text(about, "h2", "Rooted in the hills.");
  }
  const knobAbout = doc.querySelector(".knob--about");
  knobAbout?.setAttribute("aria-label", "Read about our sustainability");
  on(knobAbout, () => actions.goTo("#rooted"));

  const stove = doc.querySelector(".card--stove");
  if (stove) {
    text(stove, ".label", "The Mussoorie Diary");
    text(stove, "h2", "Garhwali, slow-cooked");
    const knob = stove.querySelector(".knob");
    knob?.setAttribute("aria-label", "Open the Mussoorie Diary");
    on(knob, () => actions.goTo("#diary"));
  }

  const scroll = doc.querySelector<HTMLAnchorElement>(".scroll");
  if (scroll) {
    if (scroll.firstChild?.nodeType === Node.TEXT_NODE) scroll.firstChild.textContent = "Discover";
    on(scroll, () => actions.goTo("#book"));
  }

  const style = doc.createElement("style");
  style.dataset.checkmate = "cursor";
  style.textContent = kingCursorCss(cursor);
  doc.head.appendChild(style);

  // Below 900px the authored hero is one tall column; size the frame to it so the page
  // scrolls as one document instead of nesting a scroller.
  const hero = doc.querySelector<HTMLElement>(".hero");
  const stage = doc.querySelector<HTMLElement>(".stage");
  const measure = () => {
    const win = frame.contentWindow;
    if (!win || !hero || !stage) return;
    if (win.matchMedia("(max-width: 900px)").matches) {
      const bottom = Math.max(stage.offsetTop + stage.offsetHeight, ...[...hero.children].map((c) => (c as HTMLElement).offsetTop + (c as HTMLElement).offsetHeight));
      actions.onLayout(Math.ceil(bottom));
    } else actions.onLayout(null);
  };
  measure();
  const ro = new (frame.contentWindow as unknown as typeof window).ResizeObserver(measure);
  ro.observe(stage!);
  frame.contentWindow?.addEventListener("resize", measure);
}

export function supportsWebGL2() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}
