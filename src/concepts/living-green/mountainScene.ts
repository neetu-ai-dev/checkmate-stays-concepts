import * as THREE from "three";

/* Concept Two — the mountain scenery for the restored hero.

   A photographic plate (layered Himalayan foothills at dawn, licensed stock) with a depth
   map derived from its aerial haze (scripts/make-depth.mjs). Everything the earlier
   procedural range did still happens, but on the photograph and driven by its depth, so the
   effects belong to the picture rather than floating over it:
   - pointer parallax: nearer ridges shift more than far ones;
   - the amber contour light under the pointer follows the real ridge layers;
   - the survey pulse sweeps out from the horizon on arrival and from every click;
   - mist drifts through the valley band, coloured from the photograph itself;
   - warm motes and three distant birds.
   One graded shader pass for the plate, plus motes and birds: three draw calls.

   It can draw into a canvas that lives in another same-origin document (the authored hero
   page's own #scene canvas) and listen to that document's pointer.

   Performance rules, set by profiling the original moss scene (three rAF loops, ~42 draw
   calls a frame, never paused off-screen):
   - a single loop that stops when its host is off-screen or the tab is hidden;
   - pixel ratio capped at 1.5 and lowered automatically on slow frames;
   - fewer motes on small screens;
   - reduced motion renders one static frame. */

const PHOTO = "/stock/highlands-dawn-lg.webp";
const DEPTH = "/landing-pages/highlands-assets/dawn-depth.png";
const PHOTO_ASPECT = 2560 / 1590;

const PLATE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const PLATE_FRAG = /* glsl */ `
  uniform sampler2D uPhoto;
  uniform sampler2D uDepth;
  uniform float uAspect;
  uniform float uPhotoAspect;
  uniform vec2 uFocus;
  uniform float uZoom;
  uniform vec2 uParallax;
  uniform vec2 uPointer;
  uniform float uPointerOn;
  uniform float uTime;
  uniform float uIntro;
  uniform vec2 uPulseC;
  uniform float uPulseR;
  uniform float uPulseA;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  // screen (top-down) → photo (top-down), cover-fitted around a focus point
  vec2 toPhoto(vec2 s, float zoom) {
    vec2 ext = uAspect > uPhotoAspect ? vec2(1.0, uPhotoAspect / uAspect) : vec2(uAspect / uPhotoAspect, 1.0);
    ext /= zoom;
    vec2 c = clamp(uFocus, ext * 0.5, 1.0 - ext * 0.5);
    return c + (s - 0.5) * ext;
  }
  vec4 photo(vec2 p, float bias) { return texture2D(uPhoto, vec2(p.x, 1.0 - p.y), bias); }
  float depthAt(vec2 p) { return texture2D(uDepth, vec2(p.x, 1.0 - p.y)).r; }

  void main() {
    vec2 s = vec2(vUv.x, 1.0 - vUv.y);
    float zoom = uZoom * (1.0 + (1.0 - uIntro) * 0.045);
    vec2 p0 = toPhoto(s, zoom);

    // depth parallax: two refinement steps so a ridge moves with its own depth
    vec2 shift = uParallax * vec2(0.016, 0.008) / zoom;
    float d = depthAt(p0);
    vec2 p = p0 - shift * (1.0 - d);
    d = depthAt(p);
    p = clamp(p0 - shift * (1.0 - d), 0.001, 0.999);
    vec3 col = photo(p, 0.0).rgb;
    float land = 1.0 - smoothstep(0.9, 0.985, d);

    // mist drifting through the valley band, tinted from the photograph's own haze
    vec2 m = p * vec2(3.2, 9.0) + vec2(uTime * 0.014, sin(uTime * 0.05) * 0.2);
    float n = vnoise(m) * 0.55 + vnoise(m * 2.03 + 7.1) * 0.3 + vnoise(m * 4.1 - uTime * 0.02) * 0.15;
    float band = smoothstep(0.42, 0.66, d) * (1.0 - smoothstep(0.8, 0.95, d));
    vec3 haze = photo(p + vec2(0.0, -0.03), 4.5).rgb * 1.06;
    float mist = smoothstep(0.45, 0.85, n) * band * (0.2 + (1.0 - uIntro) * 0.5);
    col = mix(col, haze, mist);

    // grade: a little restraint in saturation, slate in the shadows, warm stone in the light
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l), col, 0.86);
    col = mix(col, col * vec3(0.84, 0.93, 1.1), (1.0 - l) * 0.62);
    col = mix(col, col * vec3(1.05, 0.98, 0.9), smoothstep(0.45, 0.95, l) * 0.5);
    col = (col - 0.5) * 1.04 + 0.5;

    // a graduated filter over the upper sky, as a photographer would hold one: the zenith
    // deepens to slate so the headline can sit in it
    float grad = smoothstep(0.66, 0.0, s.y) * (0.35 + 0.65 * smoothstep(0.75, 1.0, d));
    col = mix(col, col * vec3(0.3, 0.37, 0.49), grad * 0.88);

    // the contour light: soft iso-depth lines that follow the ridges, lit like lamplight under the pointer
    float h = d * 22.0 - uTime * 0.04;
    float line = abs(fract(h) - 0.5) / max(fwidth(h), 0.0001);
    float contour = 1.0 - smoothstep(0.0, 2.4, line);
    vec2 dp = (s - uPointer) * vec2(uAspect, 1.0);
    float glow = uPointerOn * exp(-dot(dp, dp) / 0.034);
    vec3 amber = vec3(1.0, 0.8, 0.54);
    col += amber * land * (contour * glow * 0.3 + glow * 0.06);

    // the survey pulse: a broad, soft wave of the same light
    vec2 dq = (s - uPulseC) * vec2(uAspect, 1.0);
    float pr = length(dq) - uPulseR;
    float ring = exp(-pr * pr / 0.005) * uPulseA;
    col += amber * ring * land * (contour * 0.5 + 0.07);

    // low sun on the crests: where a ridge meets farther haze just above it, a faint warm rim
    float above = depthAt(p + vec2(0.0, 0.0035));
    float rim = clamp((above - d) * 14.0, 0.0, 1.0) * land * smoothstep(0.35, 0.85, d);
    col += vec3(1.0, 0.76, 0.5) * rim * 0.16;

    // arrival exposure and a soft vignette
    col *= mix(0.62, 1.0, uIntro);
    vec2 v = s - vec2(0.5, 0.48);
    col *= 1.0 - smoothstep(0.35, 0.95, length(v * vec2(1.0, 1.25))) * 0.28;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

const MOTE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixel;
  uniform float uAspect;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float t = uTime * (0.15 + aSeed * 0.2);
    p.x += sin(t + aSeed * 30.0) * 0.08 + uTime * 0.008;
    p.y += sin(t * 1.3 + aSeed * 12.0) * 0.05;
    p.x = mod(p.x + uAspect, uAspect * 2.0) - uAspect;
    gl_PointSize = uPixel * (0.6 + aSeed * 1.6);
    vAlpha = 0.3 + 0.7 * abs(sin(t * 2.0 + aSeed * 40.0));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const MOTE_FRAG = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(1.0, 0.86, 0.66, smoothstep(0.5, 0.0, d) * vAlpha * 0.28);
  }
`;

/* three birds riding a slow thermal high over the range: two wing triangles each */
const BIRD_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uAspect;
  attribute float aBird;
  attribute float aTip;
  void main() {
    float t = uTime * 0.035 + aBird * 0.31;
    vec2 c = vec2(sin(t * 6.2831) * uAspect * 0.32 + 0.18 * uAspect + aBird * 0.07, 0.44 + aBird * 0.05 + sin(t * 12.0) * 0.015);
    vec3 p = position * (0.016 - aBird * 0.002);
    p.y += sin(uTime * 5.5 + aBird * 2.0) * 0.006 * aTip;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(c + p.xy, 0.2, 1.0);
  }
`;

export type MountainOptions = {
  compact: boolean;
  reduced: boolean;
  /** Draw into an existing canvas (e.g. the hero document's #scene) instead of creating one. */
  canvas?: HTMLCanvasElement;
  /** Window whose pointer drives the scene; defaults to this one. */
  eventWindow?: Window;
};

export class MountainScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private uniforms = {
    uPhoto: { value: null as THREE.Texture | null },
    uDepth: { value: null as THREE.Texture | null },
    uAspect: { value: 1 },
    uPhotoAspect: { value: PHOTO_ASPECT },
    uFocus: { value: new THREE.Vector2(0.5, 0.42) },
    uZoom: { value: 1 },
    uParallax: { value: new THREE.Vector2() },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uPointerOn: { value: 0 },
    uTime: { value: 0 },
    uIntro: { value: 0 },
    uPixel: { value: 1 },
    uPulseC: { value: new THREE.Vector2(0.5, 0.5) },
    uPulseR: { value: 0 },
    uPulseA: { value: 0 },
  };
  private canvas: HTMLCanvasElement;
  private win: Window;
  private raf = 0;
  private visible = true;
  private ready = false;
  private dpr: number;
  private minDpr: number;
  private slowFrames = 0;
  private last = 0;
  private arrivedAt = 0;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0, sx: 0.5, sy: 0.5, on: 0, ton: 0 };
  private io: IntersectionObserver;
  private ro?: ResizeObserver;

  constructor(private host: HTMLElement, private opts: MountainOptions) {
    // one shader pass over a photograph: sharpness matters more than fill rate here
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.minDpr = 1;
    this.win = opts.eventWindow ?? window;
    this.renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: false, alpha: false, powerPreference: "high-performance", stencil: false, depth: false });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setClearColor(0x2c3847);
    this.canvas = this.renderer.domElement;
    if (!opts.canvas) host.appendChild(this.canvas);
    this.uniforms.uPixel.value = this.dpr * (opts.compact ? 2 : 2.6);

    this.buildPlate();
    this.buildMotes(opts.compact ? 30 : 70);
    this.buildBirds();

    if (opts.canvas) this.win.addEventListener("resize", this.resize);
    else { this.ro = new ResizeObserver(this.resize); this.ro.observe(host); }
    this.resize();
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.loop(); });
    this.io.observe(host);
    document.addEventListener("visibilitychange", this.onVisibility);
    if (!opts.reduced && this.win.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      this.win.addEventListener("pointermove", this.onPointer, { passive: true });
      this.win.document.addEventListener("pointerleave", this.onLeave);
    }
    if (!opts.reduced) this.win.addEventListener("pointerdown", this.onPulse, { passive: true });
  }

  private buildPlate() {
    const loader = new THREE.TextureLoader();
    let pending = 2;
    const done = () => {
      if (--pending) return;
      this.ready = true;
      this.arrivedAt = performance.now();
      if (this.opts.reduced) this.uniforms.uIntro.value = 1;
      else this.pulse(0.52, 0.47); // the arrival sweep, out from the snow line
      this.loop();
    };
    const photo = loader.load(PHOTO, done);
    photo.minFilter = THREE.LinearMipmapLinearFilter;
    photo.anisotropy = 4;
    const depth = loader.load(DEPTH, done);
    depth.generateMipmaps = false;
    depth.minFilter = THREE.LinearFilter;
    // the plate is authored in display (sRGB) values and written out unconverted
    photo.colorSpace = depth.colorSpace = THREE.NoColorSpace;
    this.uniforms.uPhoto.value = photo;
    this.uniforms.uDepth.value = depth;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: PLATE_VERT, fragmentShader: PLATE_FRAG, depthTest: false, depthWrite: false }));
    plate.frustumCulled = false;
    this.scene.add(plate);
  }

  private buildMotes(count: number) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3), s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() * 2 - 1) * 2;
      p[i * 3 + 1] = -0.95 + Math.random() * 1.2;
      p[i * 3 + 2] = 0.1;
      s[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
    const motes = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    motes.frustumCulled = false;
    this.scene.add(motes);
  }

  private buildBirds() {
    const pos: number[] = [], bird: number[] = [], tip: number[] = [];
    for (let b = 0; b < 3; b++) {
      // left wing, right wing: leading shoulder, trailing shoulder, raised tip
      for (const side of [-1, 1]) {
        pos.push(0, 0.05, 0, 0, -0.06, 0, side * 0.75, 0.12, 0);
        bird.push(b, b, b);
        tip.push(0, 0, 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aBird", new THREE.Float32BufferAttribute(bird, 1));
    g.setAttribute("aTip", new THREE.Float32BufferAttribute(tip, 1));
    const m = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: BIRD_VERT, fragmentShader: "void main(){ gl_FragColor = vec4(0.14, 0.16, 0.21, 0.78); }", side: THREE.DoubleSide, transparent: true, depthTest: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  private pulse(x: number, y: number) {
    this.uniforms.uPulseC.value.set(x, y);
    this.uniforms.uPulseR.value = 0;
    this.uniforms.uPulseA.value = 1;
  }

  private onPulse = (e: PointerEvent) => {
    if ((e.target as Element)?.closest?.("a, button, input")) return;
    const r = this.canvas.getBoundingClientRect();
    this.pulse((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    this.loop();
  };

  private onPointer = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    const inside = e.clientY >= r.top && e.clientY <= r.bottom;
    this.pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    this.pointer.ton = inside ? 1 : 0;
  };
  private onLeave = () => { this.pointer.ton = 0; };
  private onVisibility = () => this.loop();

  private loop() {
    if (!this.ready) return;
    if (this.opts.reduced) { this.draw(0, 0); return; }
    if (!this.raf && this.visible && !document.hidden) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (!this.visible || document.hidden) return;
    const dt = Math.min(now - this.last, 100);
    this.last = now;
    if (dt > 24) this.slowFrames++; else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 45 && this.dpr > this.minDpr) {
      this.dpr = Math.max(this.minDpr, this.dpr - 0.25);
      this.renderer.setPixelRatio(this.dpr);
      this.resize();
      this.slowFrames = 0;
    }
    this.draw(now / 1000, dt / 1000);
    this.raf = requestAnimationFrame(this.tick);
  };

  private draw(t: number, dt: number) {
    const p = this.pointer;
    p.x += (p.tx - p.x) * 0.05;
    p.y += (p.ty - p.y) * 0.05;
    p.on += (p.ton - p.on) * 0.06;
    const u = this.uniforms;
    u.uTime.value = t;
    if (!this.opts.reduced) {
      // the arrival: exposure lifts, the dolly settles and the valley mist thins (2.6 s)
      const a = Math.min(1, (performance.now() - this.arrivedAt) / 2600);
      u.uIntro.value = 1 - Math.pow(1 - a, 3);
    }
    if (u.uPulseA.value > 0) {
      u.uPulseR.value += dt * 0.42;
      u.uPulseA.value = Math.max(0, 1 - u.uPulseR.value / 1.5);
    }
    u.uParallax.value.set(p.x + Math.sin(t * 0.07) * 0.25, p.y * 0.8);
    u.uPointer.value.set((p.x + 1) / 2, (p.y + 1) / 2);
    u.uPointerOn.value = p.on;
    this.renderer.render(this.scene, this.camera);
  }

  private resize = () => {
    const r = this.canvas.getBoundingClientRect();
    const w = this.opts.canvas ? r.width : this.host.getBoundingClientRect().width;
    const h = this.opts.canvas ? r.height : this.host.getBoundingClientRect().height;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.uniforms.uAspect.value = aspect;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.updateProjectionMatrix();
    // wide screens: crop in so the snow line sits near mid-height, under the headline's sky;
    // portrait screens: the full height, framed on the nearer ridges to the right
    const portrait = aspect < 1;
    this.uniforms.uZoom.value = portrait ? 1 : 1.18;
    this.uniforms.uFocus.value.set(portrait ? 0.64 : 0.5, 0.42);
    if (this.opts.reduced && this.ready) this.draw(0, 0);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.ro?.disconnect();
    this.win.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.win.removeEventListener("pointermove", this.onPointer);
    this.win.removeEventListener("pointerdown", this.onPulse);
    try { this.win.document.removeEventListener("pointerleave", this.onLeave); } catch { /* frame already gone */ }
    this.uniforms.uPhoto.value?.dispose();
    this.uniforms.uDepth.value?.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose?.();
    });
    this.renderer.dispose();
    if (!this.opts.canvas) this.canvas.remove();
  }
}
