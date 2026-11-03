import { Link } from "react-router-dom";
import { useDocumentTitle, useFonts } from "../shared/useFonts";
import { useKingCursor } from "../shared/kingCursor";
import { Wordmark } from "../shared/ui";
import "./hub.css";

const CONCEPTS = [
  {
    to: "/concepts/approach", n: "01", title: "Approach", image: "approach-sunrise-huts",
    line: "Above a sea of cloud at first light, a slow glide up the valley to the retreat, and the arrival scene slides in with booking.",
    tags: ["Camera path", "Arrival scene", "Scroll-driven rail"],
  },
  {
    to: "/concepts/highlands", n: "02", title: "Highlands", image: "highlands-dawn",
    line: "The SylvaHero experience (dock, liquid-metal controls, pixel reveals) over a dawn photograph that moves with depth.",
    tags: ["Adapted SylvaHero", "Depth-mapped photo", "Scroll-driven rail"],
  },
  {
    to: "/concepts/ridgelight", n: "03", title: "Ridgelight", image: "aframe-lodge",
    line: "A full day in the mountains: the world runs from morning to starlight as you scroll, photographs rising in ridgeline frames.",
    tags: ["Three.js world", "Day-to-night", "Ridgeline frames"],
  },
  {
    to: "/concepts/checkmate", n: "04", title: "Checkmate", image: "noir-retreat",
    line: "Opens on the board, one move from mate. Scroll plays Qg7#, and the queen's silhouette opens onto the retreat; booking follows.",
    tags: ["Canvas 2D chess", "Short opening", "Scroll timeline"],
  },
];

export function Hub() {
  useFonts("family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500");
  useDocumentTitle("Checkmate Stays — Four Concepts");
  useKingCursor({ fill: "#f3ece0", stroke: "#0b0a0c", accent: "#f1a51e" });
  return (
    <main className="hub">
      <header className="hub-head">
        <Wordmark className="hub-mark" />
        <div>
          <p className="hub-kicker">Homepage design concepts · preview build</p>
          <h1>Four ways into Charleville</h1>
          <p className="hub-sub">Each concept is a complete, working homepage with live booking search. Open one, or switch between them with the pill in the corner.</p>
        </div>
      </header>
      <ol className="hub-grid">
        {CONCEPTS.map((c) => (
          <li key={c.to}>
            <Link to={c.to} className="hub-card">
              <img src={`/stock/${c.image}-sm.webp`} alt="" loading="lazy" />
              <span className="hub-n">{c.n}</span>
              <span className="hub-card-body">
                <span className="hub-title">{c.title}</span>
                <span className="hub-line">{c.line}</span>
                <span className="hub-tags">{c.tags.map((t) => <span key={t}>{t}</span>)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <footer className="hub-foot">
        <p>Photography is licensed Unsplash stock, used for illustration only — it does not depict Checkmate Stays. <Link to="/credits">Image credits</Link></p>
        <p>Business copy is taken from <a href="https://www.checkmatestays.com/">checkmatestays.com</a>. Booking buttons open the live engine’s availability search; nothing is reserved without completing checkout there.</p>
      </footer>
    </main>
  );
}
