import * as THREE from "three";
import { buildHouse, buildOak, buildPines, disposeScene, glowTexture, ridgeTexture, seeded, smoothDamp, type House } from "../../shared/three/retreatKit";

/* Ridgelight. A fixed 3D world behind the whole page: layered Himalayan
   ridges, a house on a ridge, the old oak beside it, pines and a sky that runs through a
   full day. Each chapter sets a camera waypoint; page progress sets the hour.

   Time of day is one continuous function of page progress (morning → midday → afternoon →
   sunset → dusk → night). Every element reads from the same interpolated keyframe: sky
   gradient and sun glow, sun direction / colour / intensity (and therefore shadows), the
   hemisphere fill, haze colour and density, ridge tint, exposure, the house's window lamps,
   and the stars and moon after dusk.

   Rendering is on demand: frames are drawn only while the camera eases, the pointer moves
   or the hour changes. ~16 draw calls; soft shadows on desktop only. */

export const WAYPOINTS: { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [4, 6.5, 36], look: [-5, 5.6, -6] },     // 0 hero — the house right of the headline, range behind
  { pos: [-15, 10.5, 27], look: [-5, 8.6, 0] },   // 1 the house — low in frame, beneath the suite panels
  { pos: [-24, 4.2, 17], look: [-12, 5.2, 1] },   // 2 the oak and the garden
  { pos: [5, 3.2, 24], look: [-4, 17, -60] },     // 3 after dark — the sky
  { pos: [12, 3.4, 17], look: [2.5, 3.2, 0] },    // 4 the diary — the lit ground floor, left of the copy
  { pos: [0, 13, 52], look: [0, 6, -20] },        // 5 afterglow — wide and high
];

type Key = {
  t: number; el: number; az: number;
  zenith: string; horizon: string; glow: string; glowAmt: number;
  sun: string; sunI: number; sky: string; ground: string; hemiI: number;
  fog: string; fogD: number; ridge: number; exposure: number; lamps: number; stars: number;
};

/* The day, keyed to page progress. Elevation/azimuth in degrees (azimuth 0 = behind the house). */
const DAY: Key[] = [
  { t: 0.0, el: 14, az: -60, zenith: "#6d97c4", horizon: "#f1d9bd", glow: "#ffd9a8", glowAmt: 0.8, sun: "#ffe1b8", sunI: 3.2, sky: "#bfd3e4", ground: "#4b4a3c", hemiI: 1.5, fog: "#c9d4da", fogD: 0.0042, ridge: 0.95, exposure: 1.0, lamps: 0.15, stars: 0 },
  { t: 0.18, el: 58, az: -15, zenith: "#4a7fbf", horizon: "#d4e2ec", glow: "#fff4dd", glowAmt: 0.45, sun: "#fff4e6", sunI: 4.0, sky: "#c8dcec", ground: "#535244", hemiI: 1.7, fog: "#bfd0dc", fogD: 0.0038, ridge: 1.0, exposure: 1.0, lamps: 0, stars: 0 },
  { t: 0.38, el: 34, az: 30, zenith: "#5a8cc2", horizon: "#e7dcc6", glow: "#ffe6bf", glowAmt: 0.6, sun: "#ffe7c2", sunI: 3.5, sky: "#c4d4de", ground: "#4f4a3c", hemiI: 1.55, fog: "#c6cfd2", fogD: 0.004, ridge: 0.95, exposure: 1.0, lamps: 0, stars: 0 },
  { t: 0.56, el: 4, az: 58, zenith: "#3a5884", horizon: "#f09a5a", glow: "#ff9a52", glowAmt: 1.1, sun: "#ff9d5c", sunI: 2.4, sky: "#a7a3b4", ground: "#3c3230", hemiI: 1.0, fog: "#c49a80", fogD: 0.0048, ridge: 0.72, exposure: 1.05, lamps: 0.45, stars: 0 },
  { t: 0.7, el: -5, az: 70, zenith: "#1b2b48", horizon: "#8a5a6c", glow: "#d0705a", glowAmt: 0.7, sun: "#c46a5a", sunI: 0.35, sky: "#5a6480", ground: "#1c1a1e", hemiI: 0.55, fog: "#3e4a5e", fogD: 0.0058, ridge: 0.42, exposure: 1.1, lamps: 0.85, stars: 0.3 },
  { t: 0.84, el: 38, az: -30, zenith: "#050a12", horizon: "#1a2a36", glow: "#3a4a60", glowAmt: 0.2, sun: "#a9c7d6", sunI: 1.0, sky: "#52707c", ground: "#060a08", hemiI: 0.5, fog: "#1d3640", fogD: 0.0068, ridge: 0.3, exposure: 1.15, lamps: 1, stars: 1 },
  { t: 1.0, el: 42, az: -25, zenith: "#04080f", horizon: "#16242e", glow: "#2f3c52", glowAmt: 0.15, sun: "#a9c7d6", sunI: 0.95, sky: "#4a6874", ground: "#050908", hemiI: 0.45, fog: "#1a303a", fogD: 0.007, ridge: 0.27, exposure: 1.15, lamps: 1, stars: 1 },
];

const SKY_FRAG = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uSunDir;
  uniform float uGlowAmt;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uZenith, smoothstep(-0.03, 0.55, h));
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    col += uGlow * (pow(s, 8.0) * 0.45 + pow(s, 90.0) * 0.9) * uGlowAmt;
    col += uGlow * smoothstep(0.16, -0.02, h) * 0.22 * uGlowAmt;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export type WorldOptions = { compact: boolean; reduced: boolean };

const C = (hex: string) => new THREE.Color(hex);
/** the sky shader works in display values, so its colours are passed unconverted */
const D = (hex: string) => { const c = new THREE.Color(); c.setStyle(hex, THREE.LinearSRGBColorSpace); return c; };

export class RidgeWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.3, 600);
  private pos = new THREE.Vector3(...WAYPOINTS[0].pos);
  private look = new THREE.Vector3(...WAYPOINTS[0].look);
  private tPos = this.pos.clone();
  private tLook = this.look.clone();
  private vPos = new THREE.Vector3();
  private vLook = new THREE.Vector3();
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private raf = 0;
  private last = 0;
  private ro: ResizeObserver;
  private hour = -1;
  private sky!: THREE.ShaderMaterial;
  private stars!: THREE.PointsMaterial;
  private moon!: THREE.Sprite;
  private sunDisc!: THREE.Sprite;
  private sun!: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;
  private lamps: THREE.PointLight[] = [];
  private ridges: { mat: THREE.MeshBasicMaterial; depth: number }[] = [];
  private house!: House;
  private fog = new THREE.FogExp2(0x1d3640, 0.0068);

  constructor(private host: HTMLElement, private opts: WorldOptions) {
    this.renderer = new THREE.WebGLRenderer({ antialias: !opts.compact, alpha: false, powerPreference: "high-performance", stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.compact ? 1 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = !opts.compact;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    this.scene.fog = this.fog;

    this.buildSky(opts.compact);
    this.buildRidges(opts.compact);
    this.buildGround();
    this.house = buildHouse();
    this.house.group.rotation.y = -0.18;
    this.scene.add(this.house.group);
    const oak = buildOak();
    oak.position.set(-10, 0, 2);
    this.scene.add(oak);
    this.scene.add(buildPines(opts.compact ? 26 : 64, 17, (r) => {
      const x = (r() - 0.5) * 120, z = -40 + r() * 70;
      // keep the house, the oak and the view between them clear
      if (Math.abs(x) < 16 && z > -14 && z < 30) return null;
      return new THREE.Vector3(x, Math.max(-6, -Math.max(0, z - 6) * 0.22), z);
    }));
    this.buildLights();
    this.setTimeOfDay(0);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    document.addEventListener("visibilitychange", this.kick);
    if (!opts.reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) window.addEventListener("pointermove", this.onPointer, { passive: true });
    this.kick();
  }

  private buildSky(compact: boolean) {
    this.sky = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uGlowAmt: { value: 1 } },
      vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: SKY_FRAG,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), this.sky));
    const n = compact ? 700 : 1600;
    const r = seeded(3);
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(1 - r() * 0.92);
      p[i * 3] = Math.sin(ph) * Math.cos(th) * 380;
      p[i * 3 + 1] = Math.cos(ph) * 380 + 10;
      p[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 380;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    this.stars = new THREE.PointsMaterial({ color: 0xdfe8f0, size: compact ? 1.3 : 2.1, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.scene.add(new THREE.Points(g, this.stars));
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,236,214,1)", "rgba(255,200,160,0)"), fog: false, depthWrite: false, transparent: true, opacity: 0 }));
    this.moon.scale.set(26, 26, 1);
    this.moon.position.set(70, 95, -300);
    this.scene.add(this.moon);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,250,235,1)", "rgba(255,220,170,0)"), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.scale.set(46, 46, 1);
    this.scene.add(this.sunDisc);
  }

  private buildRidges(compact: boolean) {
    const w = compact ? 1024 : 2048;
    const layers = [
      { z: -230, y: -6, s: 620, seed: 11, peaks: 2.2, rough: 1.1, snow: true, color: "#c9d6de", top: 0.12, depth: 1 },
      { z: -150, y: -8, s: 420, seed: 23, peaks: 2.8, rough: 1.4, snow: true, color: "#93a7b2", top: 0.3, depth: 0.75 },
      { z: -90, y: -6, s: 270, seed: 37, peaks: 3.4, rough: 1.7, snow: false, color: "#617a84", top: 0.45, depth: 0.5 },
      { z: -48, y: -4, s: 160, seed: 41, peaks: 4.0, rough: 2.0, snow: false, color: "#3c524f", top: 0.55, depth: 0.25 },
    ];
    for (const l of layers) {
      const mat = new THREE.MeshBasicMaterial({ map: ridgeTexture(l.seed, { width: w, ...l }), transparent: true, depthWrite: false, fog: true });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(l.s, l.s / 4), mat);
      m.position.set(0, l.y + l.s / 8, l.z);
      this.scene.add(m);
      this.ridges.push({ mat, depth: l.depth });
    }
  }

  private buildGround() {
    const g = new THREE.PlaneGeometry(220, 160, 60, 40);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      // the house sits on a level shelf; the ground falls away toward the viewer and the valley
      const shelf = Math.exp(-((x * x) / 900 + (z * z) / 500));
      const fall = Math.max(0, z - 6) * 0.22 + Math.max(0, -z - 20) * 0.05;
      pos.setY(i, shelf * 0.2 - fall + Math.sin(x * 0.11) * Math.cos(z * 0.09) * 0.8);
    }
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x3d4a33, roughness: 1 }));
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private buildLights() {
    this.hemi = new THREE.HemisphereLight(0x52707c, 0x060a08, 0.55);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = !this.opts.compact;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -34; sc.right = 34; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 160;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    const spill = new THREE.PointLight(0xff9a4a, 26, 22, 1.6);
    spill.position.set(0, 2.2, 5.2);
    const oakLamp = new THREE.PointLight(0xffb070, 10, 12, 1.8);
    oakLamp.position.set(-6.5, 3, 4.5);
    this.lamps.push(spill, oakLamp);
    this.scene.add(spill, oakLamp);
  }

  /** Page progress 0–1 → the hour. Every lit element reads from one interpolated keyframe. */
  setTimeOfDay(t: number) {
    t = Math.min(1, Math.max(0, t));
    if (Math.abs(t - this.hour) < 0.0015) return;
    this.hour = t;
    let i = 0;
    while (i < DAY.length - 2 && t > DAY[i + 1].t) i++;
    const a = DAY[i], b = DAY[i + 1];
    const f = THREE.MathUtils.smoothstep(t, a.t, b.t);
    const num = (k: keyof Key) => THREE.MathUtils.lerp(a[k] as number, b[k] as number, f);
    const col = (k: keyof Key, display = false) => (display ? D(a[k] as string).lerp(D(b[k] as string), f) : C(a[k] as string).lerp(C(b[k] as string), f));

    const el = THREE.MathUtils.degToRad(num("el")), az = THREE.MathUtils.degToRad(num("az"));
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)).normalize();
    // below the horizon the key light hands over to the moon
    const night = THREE.MathUtils.smoothstep(t, 0.68, 0.84);
    const moonDir = new THREE.Vector3(0.22, 0.32, -0.92).normalize();
    const lightDir = dir.clone().lerp(moonDir, night).normalize();
    this.sun.position.copy(lightDir).multiplyScalar(80);
    this.sun.color.copy(col("sun"));
    this.sun.intensity = num("sunI");

    const u = this.sky.uniforms;
    (u.uZenith.value as THREE.Color).copy(col("zenith", true));
    (u.uHorizon.value as THREE.Color).copy(col("horizon", true));
    (u.uGlow.value as THREE.Color).copy(col("glow", true));
    (u.uSunDir.value as THREE.Vector3).copy(dir);
    u.uGlowAmt.value = num("glowAmt");
    this.sunDisc.position.copy(dir).multiplyScalar(330);
    const disc = this.sunDisc.material as THREE.SpriteMaterial;
    disc.opacity = THREE.MathUtils.clamp((num("el") + 3) / 8, 0, 1) * (1 - night);
    disc.color.copy(col("sun"));

    this.hemi.color.copy(col("sky"));
    this.hemi.groundColor.copy(col("ground"));
    this.hemi.intensity = num("hemiI");
    this.fog.color.copy(col("fog"));
    this.fog.density = num("fogD");
    this.renderer.toneMappingExposure = num("exposure");
    const tint = num("ridge");
    // ridges are painted in daylight values; dusk and night scale them down, nearest layers most
    for (const r of this.ridges) r.mat.color.setScalar(Math.min(1, tint * (0.85 + r.depth * 0.25)));

    const lamps = num("lamps");
    this.house.windows.color.setRGB(0.07 + 1.18 * lamps, 0.08 + 0.54 * lamps, 0.09 + 0.17 * lamps);
    this.house.glow.opacity = 0.7 * lamps;
    this.lamps[0].intensity = 26 * lamps;
    this.lamps[1].intensity = 10 * lamps;
    this.stars.opacity = 0.85 * num("stars");
    (this.moon.material as THREE.SpriteMaterial).opacity = night;
    this.kick();
  }

  /** Move toward a chapter's waypoint; the camera eases there and rendering stops once it settles. */
  setWaypoint(i: number) {
    const w = WAYPOINTS[Math.max(0, Math.min(WAYPOINTS.length - 1, i))];
    this.tPos.set(...w.pos);
    this.tLook.set(...w.look);
    if (this.opts.reduced) { this.pos.copy(this.tPos); this.look.copy(this.tLook); }
    this.kick();
  }

  private onPointer = (e: PointerEvent) => {
    this.pointer.tx = e.clientX / window.innerWidth - 0.5;
    this.pointer.ty = e.clientY / window.innerHeight - 0.5;
    this.kick();
  };

  private kick = () => {
    if (!this.raf && !document.hidden) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    // chapters hand the camera a new waypoint; it eases out of its current move and into the next
    if (this.opts.reduced) { this.pos.copy(this.tPos); this.look.copy(this.tLook); }
    else { smoothDamp(this.pos, this.tPos, this.vPos, 1.1, dt); smoothDamp(this.look, this.tLook, this.vLook, 1.0, dt); }
    const p = this.pointer;
    const kp = this.opts.reduced ? 1 : 1 - Math.exp(-dt * 4);
    p.x += (p.tx - p.x) * kp;
    p.y += (p.ty - p.y) * kp;
    this.camera.position.set(this.pos.x + p.x * 1.4, this.pos.y - p.y * 0.6, this.pos.z);
    this.camera.lookAt(this.look);
    this.renderer.render(this.scene, this.camera);
    const moving = this.pos.distanceToSquared(this.tPos) > 1e-4 || this.look.distanceToSquared(this.tLook) > 1e-4 || this.vPos.lengthSq() > 1e-5 || Math.abs(p.tx - p.x) > 1e-3 || Math.abs(p.ty - p.y) > 1e-3;
    if (moving) this.kick();
  };

  private resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.fov = r.width / r.height < 1 ? 58 : 40;
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    document.removeEventListener("visibilitychange", this.kick);
    window.removeEventListener("pointermove", this.onPointer);
    disposeScene(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
