/* Checkmate — the endgame, drawn with Canvas 2D.

   The whole intro is a pure function of scroll progress p ∈ [0, 1], so scrubbing backwards
   replays it exactly. The board is seen from Black's side: the cornered White king on h8
   sits at the front-left, and the Black queen glides along the seventh rank to deliver
   Qg7# (protected by the Black king on f6). Every supporting piece departs first, in a
   diagonal, tumbling sweep; the camera pushes in and holds on the glowing king while the
   last of them stream past, then pulls back for the final move.

   Position (Black to move): White Kh8 Rd1 Bb1 Nb2 a3 b4 g2 · Black Kf6 Qa7 Rc2 Be2 Nc6 b5 e4 h5.
   After 1… Qg7# the king has no flight square (g8, h7 covered; g7 protected by Kf6) and
   no White piece can capture on g7. */

type Kind = "K" | "Q" | "R" | "B" | "N" | "P";
type Side = "w" | "b";
type Piece = { kind: Kind; side: Side; sq: string; essential?: boolean; leave?: number; dir?: number };

const PIECES: Piece[] = [
  { kind: "K", side: "w", sq: "h8", essential: true },
  { kind: "K", side: "b", sq: "f6", essential: true },
  { kind: "Q", side: "b", sq: "a7", essential: true },
  { kind: "R", side: "w", sq: "d1" }, { kind: "B", side: "w", sq: "b1" }, { kind: "N", side: "w", sq: "b2" },
  { kind: "P", side: "w", sq: "a3" }, { kind: "P", side: "w", sq: "b4" }, { kind: "P", side: "w", sq: "g2" },
  { kind: "R", side: "b", sq: "c2" }, { kind: "B", side: "b", sq: "e2" }, { kind: "N", side: "b", sq: "c6" },
  { kind: "P", side: "b", sq: "b5" }, { kind: "P", side: "b", sq: "e4" }, { kind: "P", side: "b", sq: "h5" },
];

/* Profile Staunton silhouettes in a 100 × 100 box, base centred at (50, 100). */
const SHAPES: Record<Kind, string> = {
  K: "M47 1h6v6h6v6h-6v7h-6v-7h-6v-6h6zM31 27C39 19 61 19 69 27L63 43H37zM33 43h34v5H33zM37 48h26l-3 5c-1 13 3 23 11 31v4l7 4v8H22v-8l7-4v-4c8-8 12-18 11-31z",
  Q: "M28 18l8 15 4-20 6 19 4-23 4 23 6-19 4 20 8-15-5 25H33zM33 43h34v5H33zM37 48h26l-3 5c-1 13 3 23 11 31v4l7 4v8H22v-8l7-4v-4c8-8 12-18 11-31z",
  R: "M29 20h8v8h7v-8h12v8h7v-8h8v15l-7 6v33l8 8v4l6 4v10H22V90l6-4v-4l8-8V41l-7-6z",
  B: "M50 2a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9zM50 12c-9 8-14 17-12 28 1 6 5 10 5 10h14s4-4 5-10c1-6-1-12-4-17l-9 13-3-2 9-14c-1-3-3-5-5-8zM40 50h20v5H40zM42 55h16c-1 12 3 21 12 29v4l6 4v8H24v-8l6-4v-4c9-8 13-17 12-29z",
  N: "M28 100V90l6-4c0-9 4-17 12-24-6-1-11 0-16 3-6 3-11-1-9-8 4-10 13-16 18-25 2-5 5-11 11-15V8l6 8c12 3 21 15 23 30 2 15-2 28-7 40l6 4v10z",
  P: "M50 15a13 13 0 1 1 0 26a13 13 0 1 1 0-26zM38 41h24l-3 5h-3c0 13 5 24 14 33v5l6 4v12H24V88l6-4v-5c9-9 14-20 14-33h-3z",
};
const HEIGHT: Record<Kind, number> = { K: 1.55, Q: 1.42, R: 1.05, B: 1.25, N: 1.12, P: 0.9 };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;

/** Board-space coordinates from Black's side: x grows a→h right-to-left, z grows away (rank 8 nearest). */
function squareXZ(sq: string) {
  const file = sq.charCodeAt(0) - 97;
  const rank = Number(sq[1]);
  return { x: 7 - file + 0.5, z: 8 - rank + 0.5 };
}

/** Phase boundaries, exported so the DOM overlays read the same clock. The page now opens at
    ENTRY (the camera still easing back from the king) and settles at START, the mating net,
    before the visitor scrolls; everything earlier is no longer played. */
export const PHASE = {
  depart: [0.04, 0.34] as const,
  pushIn: [0.2, 0.38] as const,
  hold: [0.38, 0.47] as const,
  pullBack: [0.46, 0.56] as const,
  move: [0.56, 0.635] as const,
  topple: [0.625, 0.67] as const,
  mateText: [0.635, 0.73] as const,
  clear: [0.7, 0.78] as const,
  reveal: [0.77, 0.9] as const,
  hero: [0.86, 1] as const,
};

export const ENTRY = 0.49;
export const START = PHASE.pullBack[1];

type Camera = { fx: number; fz: number; S: number; phi: number; cx: number; cy: number; roll: number };

export type SceneAssets = { photo?: HTMLImageElement };

export class ChessScene {
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private paths: Record<Kind, Path2D>;
  private assets: SceneAssets;
  private compact = false;

  constructor(private canvas: HTMLCanvasElement, assets: SceneAssets, opts: { compact: boolean }) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.assets = assets;
    this.compact = opts.compact;
    this.paths = Object.fromEntries(Object.entries(SHAPES).map(([k, d]) => [k, new Path2D(d)])) as Record<Kind, Path2D>;
    // Departure order: farthest from the cornered king leaves first; direction alternates
    // so the sweep fans out around the king.
    const king = squareXZ("h8");
    const leavers = PIECES.filter((p) => !p.essential)
      .map((p) => ({ p, d: Math.hypot(squareXZ(p.sq).x - king.x, squareXZ(p.sq).z - king.z) }))
      .sort((a, b) => b.d - a.d);
    leavers.forEach(({ p }, i) => {
      p.leave = i / leavers.length;
      p.dir = i % 3 === 0 ? 1 : -1;
    });
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.compact ? 1.5 : 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
  }

  /** Where the mate, the centred queen and her reveal sit horizontally. */
  private focusX() {
    return 0.5;
  }

  /* ── camera ─────────────────────────────────────────────────────────── */

  private baseCamera(): Camera {
    const { w, h } = this;
    const portrait = h > w * 1.1;
    const S = portrait ? w * 0.094 : Math.min(w * 0.064, h * 0.092);
    return { fx: 4, fz: 4, S, phi: 0.92, cx: w / 2, cy: h * (portrait ? 0.5 : 0.53), roll: 0 };
  }

  private camera(p: number): Camera {
    const base = this.baseCamera();
    const { w, h } = this;
    // gentle parallax drift while the pieces leave
    const drift = seg(p, 0, PHASE.depart[1]);
    let cam: Camera = { ...base, phi: lerp(0.92, 0.82, ease(drift)), roll: lerp(-0.018, 0.012, ease(drift)), S: base.S * lerp(1, 1.06, drift) };

    // push into the cornered White king and hold there while the last pieces stream past
    const push = ease(seg(p, ...PHASE.pushIn));
    if (push > 0) {
      const k = squareXZ("h8");
      const hold = seg(p, ...PHASE.hold);
      const kingScreenH = h * (0.43 + hold * 0.04);
      const targetS = kingScreenH / (HEIGHT.K * this.pieceLift(0.6));
      cam = {
        fx: lerp(cam.fx, k.x, push), fz: lerp(cam.fz, k.z, push), S: lerp(cam.S, targetS, push),
        phi: lerp(cam.phi, 0.6 - hold * 0.05, push), cx: lerp(cam.cx, w / 2, push), cy: lerp(cam.cy, h * 0.72, push), roll: lerp(cam.roll, -0.012 * hold, push),
      };
    }
    // pull back to the mating net: h8, f6 and the seventh rank
    const back = ease(seg(p, ...PHASE.pullBack));
    if (back > 0) {
      const portrait = h > w * 1.1;
      const mateCam: Camera = {
        fx: 3.8, fz: 1.6, S: portrait ? w * 0.118 : Math.min(w * 0.095, h * 0.15), phi: portrait ? 0.68 : 0.74,
        cx: w * this.focusX(), cy: h * (portrait ? 0.6 : 0.56), roll: 0,
      };
      cam = {
        fx: lerp(cam.fx, mateCam.fx, back), fz: lerp(cam.fz, mateCam.fz, back), S: lerp(cam.S, mateCam.S, back),
        phi: lerp(cam.phi, mateCam.phi, back), cx: lerp(cam.cx, mateCam.cx, back), cy: lerp(cam.cy, mateCam.cy, back), roll: lerp(cam.roll, 0, back),
      };
    }
    return cam;
  }

  private pieceLift(phi: number) {
    return 0.35 + 0.65 * Math.cos(phi * 0.85);
  }

  private project(cam: Camera, x: number, z: number) {
    const D = 13;
    const dx = x - cam.fx;
    const dz = z - cam.fz;
    // dz > 0 is farther from the viewer
    const depth = D + dz * Math.cos(cam.phi);
    const k = D / Math.max(depth, 0.5);
    return { sx: cam.cx + dx * cam.S * k, sy: cam.cy - dz * Math.sin(cam.phi) * cam.S * k, k };
  }

  /* ── drawing ────────────────────────────────────────────────────────── */

  render(p: number) {
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#070608";
    ctx.fillRect(0, 0, w, h);
    const reveal = seg(p, ...PHASE.reveal);
    if (reveal < 1) this.drawBoardScene(p);
    if (reveal > 0) this.drawReveal(p, reveal);
    this.drawVignette(p);
  }

  private drawBoardScene(p: number) {
    const { ctx, w, h } = this;
    const cam = this.camera(p);
    const clear = ease(seg(p, ...PHASE.clear));
    // the board darkens as the camera closes on the king, then returns faintly so the mate reads as chess
    const boardFade = Math.max(seg(p, ...PHASE.pushIn) * 0.85 * (1 - seg(p, ...PHASE.pullBack) * 0.55), clear);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(cam.roll);
    ctx.translate(-w / 2, -h / 2);

    // spotlight pooled on the king's corner, brightest while the camera holds on him
    const king = this.project(cam, squareXZ("h8").x, squareXZ("h8").z);
    const hold = Math.min(seg(p, PHASE.pushIn[0] + 0.08, PHASE.hold[0]), 1 - seg(p, ...PHASE.pullBack));
    const glow = ctx.createRadialGradient(king.sx, king.sy - cam.S, 0, king.sx, king.sy, Math.max(w, h) * 0.75);
    glow.addColorStop(0, `rgba(${Math.round(120 + hold * 60)}, ${Math.round(92 + hold * 50)}, ${Math.round(62 + hold * 30)}, ${0.22 + hold * 0.14})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 1 - boardFade;
    if (ctx.globalAlpha > 0.002) this.drawBoard(cam);
    ctx.globalAlpha = 1;
    this.drawPieces(p, cam, clear);
    ctx.restore();
  }

  private drawBoard(cam: Camera) {
    const { ctx } = this;
    const corner = (x: number, z: number) => this.project(cam, x, z);
    const pad = 0.28;
    const f = [corner(-pad, -pad), corner(8 + pad, -pad), corner(8 + pad, 8 + pad), corner(-pad, 8 + pad)];
    ctx.beginPath();
    f.forEach((c, i) => (i ? ctx.lineTo(c.sx, c.sy) : ctx.moveTo(c.sx, c.sy)));
    ctx.closePath();
    ctx.fillStyle = "#0d0b0c";
    ctx.fill();
    ctx.strokeStyle = "rgba(201, 163, 92, 0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 8; z++) {
        const a = corner(x, z), b = corner(x + 1, z), c = corner(x + 1, z + 1), d = corner(x, z + 1);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.lineTo(c.sx, c.sy); ctx.lineTo(d.sx, d.sy);
        ctx.closePath();
        const light = (x + z) % 2 === 0;
        // nearer squares catch a little more light
        const near = 1 - z / 8;
        ctx.fillStyle = light ? `rgba(236, 222, 198, ${0.07 + near * 0.06})` : `rgba(107, 51, 49, ${0.1 + near * 0.08})`;
        ctx.fill();
      }
    }
    const i0 = [corner(0, 0), corner(8, 0), corner(8, 8), corner(0, 8)];
    ctx.beginPath();
    i0.forEach((c, i) => (i ? ctx.lineTo(c.sx, c.sy) : ctx.moveTo(c.sx, c.sy)));
    ctx.closePath();
    ctx.strokeStyle = "rgba(201, 163, 92, 0.3)";
    ctx.stroke();

    // coordinates along the near edge and the left edge
    ctx.fillStyle = "rgba(236, 222, 198, 0.42)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 8; i++) {
      const n = corner(i + 0.5, -pad * 0.55);
      ctx.font = `${Math.max(9, 11 * n.k)}px Jost, sans-serif`;
      ctx.fillText(String.fromCharCode(104 - i), n.sx, n.sy + 2);
      const r = corner(-pad * 0.5, i + 0.5);
      ctx.font = `${Math.max(8, 10 * r.k)}px Jost, sans-serif`;
      ctx.fillText(String(8 - i), r.sx, r.sy);
    }
  }

  private drawPieces(p: number, cam: Camera, clear: number) {
    const { w, h } = this;
    const depart = seg(p, ...PHASE.depart);
    const move = seg(p, ...PHASE.move);
    const topple = easeOut(seg(p, ...PHASE.topple));
    const lift = this.pieceLift(cam.phi);
    const fx = this.focusX();

    type Draw = { piece: Piece; x: number; z: number; ox: number; oy: number; rot: number; scale: number; alpha: number; trail: number; glow: number; tip: number; hold: number };
    const list: Draw[] = [];

    for (const piece of PIECES) {
      let { x, z } = squareXZ(piece.sq);
      let ox = 0, oy = 0, rot = 0, scale = 1, alpha = 1, trail = 0, glow = 0, tip = 0, hold = 0;

      if (!piece.essential) {
        // staggered take-off, then a diagonal tumble up and out of frame
        const t = easeIn(clamp((depart - piece.leave! * 0.62) / 0.38));
        if (t >= 1) continue;
        ox = piece.dir! * t * w * 0.55;
        oy = -t * h * 0.95 + Math.sin(t * Math.PI) * h * 0.06;
        rot = piece.dir! * t * 2.6;
        scale = 1 + t * 0.9;
        alpha = 1 - easeIn(t);
        trail = t;
      }

      if (piece.kind === "Q" && piece.side === "b") {
        const m = ease(move);
        const from = squareXZ("a7"), to = squareXZ("g7");
        x = lerp(from.x, to.x, m);
        oy = -Math.sin(m * Math.PI) * cam.S * 0.45;
        trail = move > 0 && move < 1 ? Math.sin(m * Math.PI) * 0.8 : 0;
        // centre and isolate the queen once the game is done
        const c = ease(clear);
        if (c > 0) {
          const q = this.project(cam, x, z);
          ox = (w * fx - q.sx) * c;
          oy += (h * 0.86 - q.sy) * c;
          hold = c;
        }
      } else if (piece.essential) {
        alpha = 1 - clear;
        if (piece.side === "w") {
          glow = 1 - seg(p, PHASE.move[0], PHASE.topple[1]) * 0.5;
          tip = topple;
        }
      }
      if (alpha > 0.002) list.push({ piece, x, z, ox, oy, rot, scale, alpha, trail, glow, tip, hold });
    }

    // far pieces first
    list.sort((a, b) => b.z - a.z);
    for (const d of list) {
      const base = this.project(cam, d.x, d.z);
      let size = cam.S * base.k * HEIGHT[d.piece.kind] * lift * d.scale;
      // the centred queen settles at exactly the size her silhouette reveal starts from
      if (d.hold > 0) size = lerp(size, this.h * 0.52, d.hold);
      if (d.trail > 0.05) {
        for (let i = 3; i >= 1; i--) {
          const back = i * 0.05 * d.trail;
          this.drawPiece(d.piece, base.sx + d.ox * (1 - back * 6) + (d.piece.kind === "Q" ? cam.S * base.k * i * 0.32 * d.trail : 0), base.sy + d.oy * (1 - back * 6), size, d.rot * (1 - back), d.alpha * 0.16 * (4 - i) / 3, 0, 0, false);
        }
      }
      this.drawPiece(d.piece, base.sx + d.ox, base.sy + d.oy, size, d.rot, d.alpha, d.glow, d.tip, d.trail < 0.2);
    }
  }

  private drawPiece(piece: Piece, x: number, y: number, size: number, rot: number, alpha: number, glow: number, tip: number, shadow: boolean) {
    const { ctx } = this;
    const s = size / 100;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (shadow) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.beginPath();
      ctx.ellipse(x + tip * size * 0.42, y, size * (0.3 + tip * 0.26), size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(x, y);
    // a toppled king pivots on its base edge and falls back across the board
    if (tip > 0) {
      ctx.translate(size * 0.24, 0);
      ctx.rotate(tip * 1.38);
      ctx.translate(-size * 0.24, 0);
    }
    ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.translate(-50, -100);
    const path = this.paths[piece.kind];

    if (piece.side === "w") {
      if (glow > 0) {
        ctx.shadowColor = `rgba(255, 238, 205, ${0.85 * glow})`;
        ctx.shadowBlur = 40 * glow * Math.min(2, size / 120 + 0.6);
      }
      const g = ctx.createLinearGradient(0, 0, 100, 100);
      g.addColorStop(0, "#fffbf3");
      g.addColorStop(0.55, "#efe4d0");
      g.addColorStop(1, "#c9b99d");
      ctx.fillStyle = g;
      ctx.fill(path);
      ctx.shadowBlur = 0;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, 100);
      g.addColorStop(0, "#2e2729");
      g.addColorStop(0.5, "#120e10");
      g.addColorStop(1, "#060506");
      ctx.fillStyle = g;
      ctx.fill(path);
      // specular band
      ctx.save();
      ctx.clip(path);
      const spec = ctx.createLinearGradient(0, 0, 100, 0);
      spec.addColorStop(0.25, "rgba(255, 240, 220, 0)");
      spec.addColorStop(0.36, "rgba(255, 240, 220, 0.16)");
      spec.addColorStop(0.46, "rgba(255, 240, 220, 0)");
      ctx.fillStyle = spec;
      ctx.fillRect(0, 0, 100, 100);
      ctx.restore();
      ctx.lineWidth = Math.min(1.4, s * 1.2) / Math.max(s, 0.01) * (s > 2 ? 1.6 : 1);
      ctx.strokeStyle = s > 2 ? "rgba(214, 178, 110, 0.85)" : "rgba(201, 163, 92, 0.7)";
      ctx.stroke(path);
    }
    ctx.restore();
  }

  /** The queen's silhouette opens onto the retreat, then gives way to the full photograph. */
  private drawReveal(p: number, t: number) {
    const { ctx, w, h } = this;
    const photo = this.assets.photo;
    const e = easeIn(t) * 0.92 + t * 0.08;
    const qSize = h * 0.52;
    const qx = w * this.focusX();
    // zoom about a point inside the queen's body so the opening stays solid
    const anchorX = qx, anchorY = h * 0.86 - qSize * 0.24;
    const coverScale = (Math.max(w, h) * 2.4) / (qSize * 0.17);
    const z = lerp(1, coverScale, e);
    const full = seg(t, 0.62, 0.9);

    ctx.save();
    if (full < 1) {
      ctx.translate(anchorX, anchorY);
      ctx.scale(z, z);
      ctx.translate(-anchorX, -anchorY);
      ctx.translate(qx, h * 0.86);
      const s = qSize / 100;
      ctx.scale(s, s);
      ctx.translate(-50, -100);
      ctx.clip(this.paths.Q);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = "#0e1220";
      ctx.fillRect(0, 0, w, h);
      if (photo) this.drawPhoto(photo, lerp(1.35, 1.06, t));
    }
    ctx.restore();
    if (full > 0) {
      ctx.save();
      ctx.globalAlpha = full;
      if (photo) this.drawPhoto(photo, lerp(1.35, 1.06, t) - seg(p, ...PHASE.hero) * 0.04);
      else { ctx.fillStyle = "#0e1220"; ctx.fillRect(0, 0, w, h); }
      ctx.restore();
    }
  }

  private drawPhoto(img: HTMLImageElement, zoom: number) {
    const { ctx, w, h } = this;
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    // the lit house sits left of centre; keep it in frame on narrow screens
    const focusX = w < h ? 0.42 : 0.5;
    ctx.drawImage(img, (w - dw) * focusX, (h - dh) * 0.55, dw, dh);
  }

  private drawVignette(p: number) {
    const { ctx, w, h } = this;
    const hero = seg(p, ...PHASE.reveal);
    const v = ctx.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(0,0,0,${0.75 - hero * 0.35})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}
