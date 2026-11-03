import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gsap } from "../../shared/motion";

/* Concept One — the endgame in 3D.

   Black to play: White Kh8 Rd1 Bb1 Nb2 a3 b4 g2 · Black Kf6 Qa7 Rc2 Be2 Nc6 b5 e4 h5.
   The supporting pieces lift away, the queen glides along the seventh rank to g7 (mate,
   protected by Kf6) and the White king topples. Seen from Black's side, so the cornered
   king sits at the front-left of the board.

   Cost model: one renderer, ~20 draw calls, shadows only on desktop, and rendering on
   demand — frames are drawn only while the timeline plays or the board eases toward the
   pointer, never while idle or off-screen. */

type Kind = "K" | "Q" | "R" | "B" | "N" | "P";
type Side = "w" | "b";
type Spec = { kind: Kind; side: Side; sq: string; role?: "king" | "queen" | "guard" };

const POSITION: Spec[] = [
  { kind: "K", side: "w", sq: "h8", role: "king" }, { kind: "K", side: "b", sq: "f6", role: "guard" }, { kind: "Q", side: "b", sq: "a7", role: "queen" },
  { kind: "R", side: "w", sq: "d1" }, { kind: "B", side: "w", sq: "b1" }, { kind: "N", side: "w", sq: "b2" },
  { kind: "P", side: "w", sq: "a3" }, { kind: "P", side: "w", sq: "b4" }, { kind: "P", side: "w", sq: "g2" },
  { kind: "R", side: "b", sq: "c2" }, { kind: "B", side: "b", sq: "e2" }, { kind: "N", side: "b", sq: "c6" },
  { kind: "P", side: "b", sq: "b5" }, { kind: "P", side: "b", sq: "e4" }, { kind: "P", side: "b", sq: "h5" },
];

const square = (sq: string) => {
  const file = sq.charCodeAt(0) - 97;
  const rank = Number(sq[1]);
  // Black's view: the a-file on the right, rank 8 nearest the camera
  return new THREE.Vector3(3.5 - file, 0, rank - 4.5);
};

/* Staunton profiles (radius, height) for the lathe, in square units. */
const PROFILES: Record<Exclude<Kind, "N">, [number, number][]> = {
  P: [[0, 0], [0.34, 0], [0.34, 0.06], [0.3, 0.1], [0.28, 0.14], [0.2, 0.18], [0.15, 0.3], [0.12, 0.44], [0.11, 0.5], [0.19, 0.53], [0.19, 0.56], [0.11, 0.58], [0.14, 0.62], [0.16, 0.68], [0.155, 0.74], [0.12, 0.79], [0.065, 0.82], [0, 0.83]],
  R: [[0, 0], [0.37, 0], [0.37, 0.07], [0.32, 0.11], [0.3, 0.15], [0.23, 0.2], [0.21, 0.6], [0.26, 0.66], [0.28, 0.72], [0.28, 0.84], [0.2, 0.84], [0.2, 0.78], [0, 0.78]],
  B: [[0, 0], [0.36, 0], [0.36, 0.07], [0.31, 0.11], [0.29, 0.15], [0.21, 0.2], [0.14, 0.42], [0.12, 0.6], [0.21, 0.63], [0.21, 0.66], [0.12, 0.68], [0.16, 0.74], [0.19, 0.82], [0.18, 0.9], [0.14, 0.98], [0.08, 1.04], [0.045, 1.06], [0.06, 1.09], [0.045, 1.12], [0, 1.13]],
  Q: [[0, 0], [0.39, 0], [0.39, 0.08], [0.33, 0.12], [0.31, 0.16], [0.23, 0.22], [0.15, 0.5], [0.13, 0.78], [0.24, 0.82], [0.24, 0.85], [0.14, 0.88], [0.17, 0.94], [0.24, 1.08], [0.26, 1.13], [0.2, 1.15], [0.14, 1.17], [0.09, 1.2], [0, 1.22]],
  K: [[0, 0], [0.4, 0], [0.4, 0.08], [0.34, 0.12], [0.32, 0.16], [0.24, 0.22], [0.16, 0.52], [0.14, 0.82], [0.25, 0.86], [0.25, 0.89], [0.15, 0.92], [0.18, 0.98], [0.24, 1.12], [0.25, 1.18], [0.18, 1.22], [0.08, 1.25], [0, 1.26]],
};

const KNIGHT_PATH = "M28 100V90l6-4c0-9 4-17 12-24-6-1-11 0-16 3-6 3-11-1-9-8 4-10 13-16 18-25 2-5 5-11 11-15V8l6 8c12 3 21 15 23 30 2 15-2 28-7 40l6 4v10z";

const ni = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

function buildGeometries(segments: number) {
  const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segments);
  const geo: Partial<Record<Kind, THREE.BufferGeometry>> = {};
  geo.P = lathe(PROFILES.P);
  geo.B = lathe(PROFILES.B);
  // rook: four merlons on the crown
  const merlons = [0, 1, 2, 3].map((i) => {
    const m = new THREE.BoxGeometry(0.11, 0.1, 0.14);
    m.translate(0, 0.89, 0.22);
    m.rotateY((i * Math.PI) / 2 + Math.PI / 4);
    return m;
  });
  geo.R = mergeGeometries([lathe(PROFILES.R), ...merlons].map(ni));
  // queen: a coronet of eight beads and a finial
  const beads = Array.from({ length: 8 }, (_, i) => {
    const s = new THREE.SphereGeometry(0.045, 8, 6);
    const a = (i / 8) * Math.PI * 2;
    s.translate(Math.cos(a) * 0.24, 1.15, Math.sin(a) * 0.24);
    return ni(s);
  });
  const fin = ni(new THREE.SphereGeometry(0.07, 12, 8).translate(0, 1.27, 0));
  geo.Q = mergeGeometries([ni(lathe(PROFILES.Q)), ...beads, fin]);
  // king: the cross
  const v = ni(new THREE.BoxGeometry(0.07, 0.26, 0.07).translate(0, 1.38, 0));
  const h = ni(new THREE.BoxGeometry(0.2, 0.07, 0.07).translate(0, 1.41, 0));
  geo.K = mergeGeometries([ni(lathe(PROFILES.K)), v, h]);
  // knight: an extruded head on a turned base
  const shapes = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${KNIGHT_PATH}"/></svg>`).paths.flatMap((p) => SVGLoader.createShapes(p));
  const head = new THREE.ExtrudeGeometry(shapes, { depth: 26, bevelEnabled: true, bevelThickness: 3, bevelSize: 2, bevelSegments: 2, curveSegments: 6 });
  head.translate(-50, -100, -13);
  head.scale(0.0078, -0.0105, 0.011);
  head.translate(0, 0.12, 0);
  const base = lathe([[0, 0], [0.36, 0], [0.36, 0.07], [0.31, 0.11], [0.29, 0.16], [0.24, 0.2], [0, 0.2]]);
  geo.N = mergeGeometries([ni(base), ni(head)]);
  return geo as Record<Kind, THREE.BufferGeometry>;
}

function boardTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  const s = 1024 / 8;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const light = (r + f) % 2 === 0;
      g.fillStyle = light ? "#9c8f79" : "#2b1514";
      g.fillRect(f * s, r * s, s, s);
    }
  }
  // fine grain so the squares read as polished stone, not flat colour
  const img = g.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export type ChessOptions = { compact: boolean; reduced: boolean; onPhase?: (phase: "intro" | "move" | "mate" | "done") => void };

export class ChessHero {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private rig = new THREE.Group();
  private board = new THREE.Group();
  private pieces: { spec: Spec; mesh: THREE.Mesh; home: THREE.Vector3 }[] = [];
  private ring!: THREE.Mesh;
  private dirty = true;
  private raf = 0;
  private visible = true;
  private timeline?: gsap.core.Timeline;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private scrollTilt = 0;
  private io: IntersectionObserver;
  private ro: ResizeObserver;

  constructor(private host: HTMLElement, private opts: ChessOptions) {
    const { compact } = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: !compact, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !compact;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.buildLights();
    this.buildBoard();
    this.buildPieces(compact ? 20 : 40);
    this.rig.add(this.board);
    this.scene.add(this.rig);
    this.camera.position.set(0, 12.2, 15.6);
    this.camera.lookAt(0, -0.4, 0.4);
    this.rig.rotation.y = -0.32;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.kick();
    });
    this.io.observe(host);
    document.addEventListener("visibilitychange", this.onVisibility);
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) window.addEventListener("pointermove", this.onPointer, { passive: true });

    if (opts.reduced) {
      this.applyFinalPosition();
      opts.onPhase?.("done");
    } else this.play();
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xcfd8e6, 0x1a1210, 0.55));
    const key = new THREE.DirectionalLight(0xffe2bd, 2.4);
    key.position.set(-5, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
    key.shadow.bias = -0.0008;
    key.shadow.radius = 4;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc2ff, 1.6);
    rim.position.set(4, 4, -8);
    this.scene.add(rim);
  }

  private buildBoard() {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.24, 8),
      [
        new THREE.MeshStandardMaterial({ color: 0x1a1214, roughness: 0.45, metalness: 0.2 }),
        new THREE.MeshStandardMaterial({ color: 0x1a1214, roughness: 0.45, metalness: 0.2 }),
        new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.18, metalness: 0.08, envMapIntensity: 0.75 }),
        new THREE.MeshStandardMaterial({ color: 0x0d0909 }),
        new THREE.MeshStandardMaterial({ color: 0x1a1214, roughness: 0.45, metalness: 0.2 }),
        new THREE.MeshStandardMaterial({ color: 0x1a1214, roughness: 0.45, metalness: 0.2 }),
      ],
    );
    top.position.y = -0.12;
    top.receiveShadow = true;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.3, 8.7), new THREE.MeshStandardMaterial({ color: 0x9a7a45, roughness: 0.32, metalness: 0.85 }));
    frame.position.y = -0.17;
    frame.receiveShadow = true;
    this.board.add(frame, top);

    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.48, 48), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.copy(square("g7")).setY(0.012);
    this.board.add(this.ring);
  }

  private buildPieces(segments: number) {
    const geo = buildGeometries(segments);
    const white = new THREE.MeshStandardMaterial({ color: 0xf4ede0, roughness: 0.32, metalness: 0.02, emissive: 0x2a2015, envMapIntensity: 1.1 });
    const black = new THREE.MeshStandardMaterial({ color: 0x141012, roughness: 0.22, metalness: 0.15, envMapIntensity: 1.3 });
    for (const spec of POSITION) {
      // the departing pieces need their own material so each can fade on its own
      const mat = (spec.side === "w" ? white : black).clone();
      if (!spec.role) mat.transparent = true;
      const mesh = new THREE.Mesh(geo[spec.kind], mat);
      const home = square(spec.sq);
      mesh.position.copy(home);
      if (spec.kind === "N") mesh.rotation.y = spec.side === "w" ? Math.PI / 2 : -Math.PI / 2;
      mesh.castShadow = true;
      this.board.add(mesh);
      this.pieces.push({ spec, mesh, home });
    }
  }

  private get(role: Spec["role"]) {
    return this.pieces.find((p) => p.spec.role === role)!;
  }

  /** The finished position, for reduced motion and as the resting state. */
  private applyFinalPosition() {
    for (const p of this.pieces) {
      if (!p.spec.role) p.mesh.visible = false;
    }
    const q = this.get("queen");
    q.mesh.position.copy(square("g7"));
    const k = this.get("king");
    k.mesh.rotation.z = 1.32;
    k.mesh.position.copy(k.home).add(new THREE.Vector3(-0.2, 0.18, 0));
    this.invalidate();
  }

  play() {
    this.timeline?.kill();
    for (const p of this.pieces) {
      p.mesh.visible = true;
      p.mesh.position.copy(p.home);
      p.mesh.rotation.set(0, p.spec.kind === "N" ? (p.spec.side === "w" ? Math.PI / 2 : -Math.PI / 2) : 0, 0);
      p.mesh.scale.setScalar(1);
      (p.mesh.material as THREE.MeshStandardMaterial).opacity = 1;
    }
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0;
    const tl = gsap.timeline({ onUpdate: () => this.invalidate(), onComplete: () => this.opts.onPhase?.("done") });
    this.timeline = tl;
    this.opts.onPhase?.("intro");

    tl.from(this.rig.position, { y: -1.2, duration: 1.4, ease: "power3.out" }, 0)
      .from(this.rig.rotation, { y: -0.9, duration: 1.8, ease: "power3.out" }, 0);

    // supporting pieces lift away in a diagonal, tumbling sweep — farthest from the king first
    const king = this.get("king").home;
    const leavers = this.pieces.filter((p) => !p.spec.role).sort((a, b) => b.home.distanceTo(king) - a.home.distanceTo(king));
    leavers.forEach((p, i) => {
      const at = 1.2 + i * 0.09;
      const dir = i % 3 === 0 ? 1 : -1;
      tl.to(p.mesh.position, { y: 4.5 + (i % 4) * 0.6, x: p.home.x + dir * 2.2, z: p.home.z - 2.4, duration: 1.3, ease: "power2.in" }, at)
        .to(p.mesh.rotation, { x: dir * 2.2, z: -dir * 1.6, duration: 1.3, ease: "power1.in" }, at)
        .to(p.mesh.material, { opacity: 0, duration: 0.9, ease: "power1.in" }, at + 0.4)
        .set(p.mesh, { visible: false }, at + 1.3);
    });

    // the move: Qa7–g7, lifted along a low arc
    const q = this.get("queen");
    const to = square("g7");
    const moveAt = 1.2 + leavers.length * 0.09 + 1.1;
    tl.call(() => this.opts.onPhase?.("move"), [], moveAt)
      .to(q.mesh.position, { x: to.x, duration: 1.25, ease: "power2.inOut" }, moveAt)
      .to(q.mesh.position, { y: 0.45, duration: 0.62, ease: "sine.out", yoyo: true, repeat: 1 }, moveAt)
      .fromTo(this.ring.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 1.9, y: 1.9, z: 1.9, duration: 0.9, ease: "power2.out" }, moveAt + 1.2)
      .fromTo(this.ring.material, { opacity: 0.9 }, { opacity: 0, duration: 0.9, ease: "power1.out" }, moveAt + 1.2);

    // the White king topples toward the corner
    const k = this.get("king");
    tl.call(() => this.opts.onPhase?.("mate"), [], moveAt + 1.35)
      .to(k.mesh.rotation, { z: 1.32, duration: 0.9, ease: "bounce.out" }, moveAt + 1.45)
      .to(k.mesh.position, { x: k.home.x - 0.2, y: 0.18, duration: 0.9, ease: "power2.out" }, moveAt + 1.45);
    this.kick();
  }

  setScrollProgress(p: number) {
    this.scrollTilt = p;
    this.invalidate();
  }

  private onPointer = (e: PointerEvent) => {
    this.pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    this.pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    this.kick();
  };

  private onVisibility = () => { if (!document.hidden) this.kick(); };

  private invalidate() {
    this.dirty = true;
    this.kick();
  }

  private kick() {
    if (!this.raf && this.visible && !document.hidden) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = () => {
    this.raf = 0;
    const p = this.pointer;
    const ease = this.opts.reduced ? 1 : 0.08;
    p.x += (p.tx - p.x) * ease;
    p.y += (p.ty - p.y) * ease;
    const settling = Math.abs(p.tx - p.x) > 0.001 || Math.abs(p.ty - p.y) > 0.001;
    this.board.rotation.y = p.x * 0.14;
    this.board.rotation.x = p.y * 0.05 + this.scrollTilt * 0.35;
    this.board.position.y = -this.scrollTilt * 1.2;
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    // keep drawing only while something is still moving
    if (settling || this.timeline?.isActive()) this.kick();
  };

  private resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    // keep the whole board in frame on narrow hosts
    const aspect = r.width / r.height;
    this.camera.fov = aspect < 1.05 ? Math.min(30 / Math.max(0.6, aspect / 1.05), 48) : 30;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  dispose() {
    this.timeline?.kill();
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pointermove", this.onPointer);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((mat) => { (mat as THREE.MeshStandardMaterial).map?.dispose(); mat.dispose(); });
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export function webglAvailable() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}
