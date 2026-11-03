import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* Shared, lightweight pieces of the mountain-retreat worlds (Approach and Ridgelight): the house
   with its wave-curved roof and L-shaped balcony, the old oak, instanced pines, painted
   ridge silhouettes and soft glow sprites. Everything is merged per material so a whole
   house is a handful of draw calls. */

export function seeded(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

/** A ridge silhouette painted to a canvas: transparent sky, solid range, optional snow. */
export function ridgeTexture(seed: number, opts: { width: number; peaks: number; rough: number; snow: boolean; color: string; top: number }) {
  const c = document.createElement("canvas");
  c.width = opts.width; c.height = opts.width / 4;
  const g = c.getContext("2d")!;
  const r = seeded(seed);
  const pts: number[] = [];
  const N = 220;
  const phases = Array.from({ length: 5 }, () => r() * Math.PI * 2);
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    let y = 0;
    for (let o = 0; o < 5; o++) y += Math.abs(Math.sin(x * Math.PI * opts.peaks * (o + 1) * 0.9 + phases[o])) / (o + 1) ** opts.rough;
    pts.push(y);
  }
  const max = Math.max(...pts), min = Math.min(...pts);
  const H = c.height;
  const yAt = (i: number) => H * (opts.top + (1 - (pts[i] - min) / (max - min)) * (0.85 - opts.top));
  g.beginPath();
  g.moveTo(0, H);
  for (let i = 0; i <= N; i++) g.lineTo((i / N) * c.width, yAt(i));
  g.lineTo(c.width, H);
  g.closePath();
  const fill = g.createLinearGradient(0, H * opts.top, 0, H);
  fill.addColorStop(0, opts.color);
  fill.addColorStop(1, "#05090b");
  g.fillStyle = fill;
  g.fill();
  if (opts.snow) {
    g.save();
    g.clip();
    // two-pixel columns along the interpolated ridge line, so steep faces stay smooth
    for (let px = 0; px < c.width; px += 2) {
      const u = (px / c.width) * N, i = Math.min(N - 1, Math.floor(u)), t = u - i;
      const y = yAt(i) * (1 - t) + yAt(i + 1) * t;
      // a continuous snow depth (no per-column randomness, which read as streaks)
      const depth = H * 0.065 * (0.75 + 0.35 * Math.sin(u * 0.19 + phases[0]) * Math.sin(u * 0.053 + phases[1]));
      const grad = g.createLinearGradient(0, y, 0, y + depth);
      grad.addColorStop(0, "rgba(228, 236, 240, 0.85)");
      grad.addColorStop(1, "rgba(228, 236, 240, 0)");
      g.fillStyle = grad;
      g.fillRect(px, y - 1, 2, depth + 1);
    }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function glowTexture(inner: string, outer: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export type House = { group: THREE.Group; windows: THREE.MeshBasicMaterial; glow: THREE.PointsMaterial };

/** Two storeys, the upper set back and wrapped by an L-shaped balcony, under a roof that
    undulates like an inverted ridgeline. */
export function buildHouse(): House {
  const timber = new THREE.MeshStandardMaterial({ color: 0x5a4436, roughness: 0.8 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x4a4f52, roughness: 0.95 });
  const group = new THREE.Group();
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => {
    const o = new THREE.Mesh(g, m);
    o.castShadow = true;
    o.receiveShadow = true;
    return o;
  };

  group.add(mesh(mergeGeometries([box(10, 3.2, 5, 0, 1.6, 0), box(8.4, 2.8, 4.2, -0.5, 4.6, -0.2)]), timber));
  group.add(mesh(box(14, 0.6, 9, 0, -0.3, 0.5), stone));

  const roofShape = new THREE.Shape();
  const span = 5.2, steps = 40;
  const wave = (x: number) => 0.42 * Math.cos((x / span) * Math.PI * 1.5) * Math.cos((x / span) * 0.6);
  roofShape.moveTo(-span, 0);
  for (let i = 0; i <= steps; i++) { const x = -span + (i / steps) * span * 2; roofShape.lineTo(x, 0.55 - wave(x)); }
  for (let i = steps; i >= 0; i--) { const x = -span + (i / steps) * span * 2; roofShape.lineTo(x, 0.3 - wave(x)); }
  const roof = new THREE.ExtrudeGeometry(roofShape, { depth: 5.4, bevelEnabled: false });
  roof.translate(-0.5, 6.0, -2.9);
  group.add(mesh(roof, new THREE.MeshStandardMaterial({ color: 0x5b6266, roughness: 0.5, metalness: 0.3 })));

  const rails: THREE.BufferGeometry[] = [box(9.6, 0.16, 1.4, -0.1, 3.25, 2.6), box(1.4, 0.16, 5.6, 4.55, 3.25, 0.4)];
  for (let i = 0; i <= 24; i++) rails.push(box(0.05, 1, 0.05, -4.8 + i * 0.4, 3.8, 3.25));
  for (let i = 0; i <= 13; i++) rails.push(box(0.05, 1, 0.05, 5.2, 3.8, -2.3 + i * 0.42));
  rails.push(box(9.7, 0.06, 0.08, -0.1, 4.3, 3.25), box(0.08, 0.06, 5.6, 5.2, 4.3, 0.4));
  group.add(mesh(mergeGeometries(rails), new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: 0.6, metalness: 0.4 })));

  const panes: THREE.BufferGeometry[] = [];
  const glows: number[] = [];
  const lit = [1, 1, 0.55, 1, 1, 0.8, 1, 0, 1];
  let k = 0;
  for (let i = 0; i < 5; i++) {
    const x = -3.8 + i * 1.9;
    if (lit[k++] > 0) { panes.push(new THREE.PlaneGeometry(1.3, 2.2).translate(x, 1.55, 2.52)); glows.push(x, 1.55, 2.9); }
  }
  for (let i = 0; i < 4; i++) {
    const x = -3.6 + i * 2.1;
    if (lit[k++] > 0) { panes.push(new THREE.PlaneGeometry(1.5, 1.9).translate(x, 4.6, 1.92)); glows.push(x, 4.6, 2.3); }
  }
  // tone-mapped so the panes read as warm lamplight rather than blown-out white
  const windows = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 0.62, 0.26) });
  group.add(new THREE.Mesh(mergeGeometries(panes), windows));
  const mullions: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) mullions.push(box(0.06, 2.2, 0.04, -3.8 + i * 1.9, 1.55, 2.54), box(1.3, 0.06, 0.04, -3.8 + i * 1.9, 1.9, 2.54));
  for (let i = 0; i < 4; i++) mullions.push(box(0.06, 1.9, 0.04, -3.6 + i * 2.1, 4.6, 1.94));
  group.add(new THREE.Mesh(mergeGeometries(mullions), new THREE.MeshStandardMaterial({ color: 0x120e0c })));
  const gg = new THREE.BufferGeometry();
  gg.setAttribute("position", new THREE.Float32BufferAttribute(glows, 3));
  const glow = new THREE.PointsMaterial({ map: glowTexture("rgba(255,176,96,0.55)", "rgba(255,140,60,0)"), size: 3.6, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  group.add(new THREE.Points(gg, glow));
  return { group, windows, glow };
}

export function buildOak(seed = 9) {
  const bark = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 1 });
  const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.45, 0.8, 4.2, 10).translate(0, 2.1, 0)];
  const limbs: [number, number, number, number][] = [[0.9, 0, 0.6, 3.6], [-1.1, 0.4, -0.5, 3.4], [0.2, -1, 0.9, 3.2]];
  for (const [rx, ry, rz, len] of limbs) {
    const l = new THREE.CylinderGeometry(0.16, 0.34, len, 8).translate(0, len / 2, 0);
    l.rotateZ(rz); l.rotateY(ry); l.rotateX(rx * 0.3);
    l.translate(0, 3.6, 0);
    parts.push(l);
  }
  const trunk = new THREE.Mesh(mergeGeometries(parts), bark);
  const r = seeded(seed);
  const crowns: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 16; i++) {
    const s = 1.4 + r() * 1.6;
    crowns.push(new THREE.IcosahedronGeometry(s, 1).translate((r() - 0.5) * 7.5, 6 + r() * 3.2, (r() - 0.5) * 6));
  }
  const canopy = new THREE.Mesh(mergeGeometries(crowns), new THREE.MeshStandardMaterial({ color: 0x34502f, roughness: 0.9, flatShading: true }));
  trunk.castShadow = canopy.castShadow = true;
  const oak = new THREE.Group();
  oak.add(trunk, canopy);
  return oak;
}

/** Instanced pines scattered by `place`, which returns a position or null to skip. */
export function buildPines(count: number, seed: number, place: (r: () => number) => THREE.Vector3 | null, color = 0x2c4632) {
  const tiers = [0, 1, 2].map((i) => new THREE.ConeGeometry(1.25 - i * 0.32, 2.4, 7).translate(0, 1.8 + i * 1.35, 0));
  const geo = mergeGeometries([new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6).translate(0, 0.6, 0), ...tiers]);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }), count);
  const r = seeded(seed);
  const m = new THREE.Matrix4();
  const base = new THREE.Color(color), tint = new THREE.Color();
  let placed = 0, guard = 0;
  while (placed < count && guard++ < count * 50) {
    const p = place(r);
    if (!p) continue;
    const s = 1.2 + r() * 1.9;
    m.compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3(s, s * (0.9 + r() * 0.5), s));
    mesh.setMatrixAt(placed, m);
    // a little hue and lightness drift per tree
    tint.copy(base).offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.12, (r() - 0.5) * 0.09);
    mesh.setColorAt(placed++, tint);
  }
  mesh.count = placed;
  mesh.castShadow = true;
  return mesh;
}

/** Smooth-damp a vector toward a target (ease in and out, continuous velocity when the target
    changes mid-move). `smoothTime` is roughly how long the move takes to mostly settle. */
export function smoothDamp(current: THREE.Vector3, target: THREE.Vector3, velocity: THREE.Vector3, smoothTime: number, dt: number) {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  for (const k of ["x", "y", "z"] as const) {
    const change = current[k] - target[k];
    const temp = (velocity[k] + omega * change) * dt;
    velocity[k] = (velocity[k] - omega * temp) * exp;
    current[k] = target[k] + (change + temp) * exp;
  }
}

export function disposeScene(scene: THREE.Scene) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    mats.forEach((mat) => { (mat as THREE.MeshBasicMaterial).map?.dispose(); mat.dispose(); });
  });
}

/** Seeded 2D Perlin noise in [-1, 1]. */
export function makeNoise(seed = 11) {
  const p = new Uint8Array(512);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const grad = (h: number, x: number, y: number) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = p[X] + Y, b = p[X + 1] + Y;
    const l = (t: number, a1: number, b1: number) => a1 + t * (b1 - a1);
    return l(v, l(u, grad(p[a], x, y), grad(p[b], x - 1, y)), l(u, grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1)));
  };
}
