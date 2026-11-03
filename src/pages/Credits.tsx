import { Link } from "react-router-dom";
import credits from "../data/stockCredits.json";
import { useDocumentTitle } from "../shared/useFonts";

export function Credits() {
  useDocumentTitle("Image credits — Checkmate Stays concepts");
  return (
    <main style={{ background: "#f6f2ea", color: "#1c1a17", minHeight: "100vh", padding: "clamp(24px,5vw,72px) clamp(16px,5vw,72px)", font: "15px/1.6 system-ui, sans-serif" }}>
      <p><Link to="/">← All concepts</Link></p>
      <h1 style={{ font: "500 2rem/1.2 Georgia, serif", margin: "16px 0 8px" }}>Image credits</h1>
      <p style={{ maxWidth: "70ch" }}>
        All photography in these concepts is licensed stock from Unsplash under the{" "}
        <a href="https://unsplash.com/license">Unsplash License</a>, used as illustrative concept imagery. None of it depicts
        Checkmate Stays or its suites. Concept 2's hero layout is adapted from ThreeUI SylvaHero (MIT).
      </p>
      <div style={{ overflowX: "auto", marginTop: 24 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
              <th style={{ padding: 8 }}>Preview</th><th style={{ padding: 8 }}>Key</th><th style={{ padding: 8 }}>Description</th><th style={{ padding: 8 }}>Photographer</th><th style={{ padding: 8 }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(credits).map(([key, c]) => (
              <tr key={key} style={{ borderBottom: "1px solid #e2ddd3" }}>
                <td style={{ padding: 8 }}><img src={`/stock/${key}-sm.webp`} alt="" width={96} height={64} style={{ width: 96, height: 64, objectFit: "cover", borderRadius: 6 }} loading="lazy" /></td>
                <td style={{ padding: 8 }}><code>{key}</code></td>
                <td style={{ padding: 8 }}>{c.description}</td>
                <td style={{ padding: 8 }}>{c.photographerUrl ? <a href={c.photographerUrl}>@{c.photographer}</a> : "—"}</td>
                <td style={{ padding: 8 }}><a href={c.source}>Unsplash</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
