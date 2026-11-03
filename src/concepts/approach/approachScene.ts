import * as THREE from "three";
import { buildHouse, buildOak, buildPines, disposeScene, glowTexture, makeNoise } from "../../shared/three/retreatKit";

/* Approach — the camera path. A wide alpine valley at first light: a sea of cloud below,
   a snow range behind, and a retreat on a ridge in the distance. Scroll progress p ∈ [0, 1]
   glides the camera down a grounded path toward the house, easing in and out, with a slight
   arc in the last stretch so the balcony side turns towards the viewer. It stops at a calm
   three-quarter view rather than a close-up; the page's next scene dissolves in over it.

   Graded for a natural morning: sage meadows and muted conifers, warm low sun, cool aerial
   haze that thickens with distance, and a soft sky.

   One lit, vertex-coloured terrain mesh (real shadows on desktop), the shared house / oak /
   pines, one cloud layer and a sun glow. Rendering is on demand — a frame per scroll or
   pointer change, plus a slow cloud drift only while the scene is on screen. */

export const APPROACH = {
  glide: [0, 0.78] as const, // above the cloud → down the valley → onto the ridge
  arc: [0.4, 0.92] as const, // a slight turn round the house towards its balcony
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p: number, [a, b]: readonly [number, number]) => clamp((p - a) / (b - a));
const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

const CLOUD_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTint;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    vec2 p = vUv * 9.0 + vec2(uTime * 0.012, uTime * 0.004);
    float n = noise(p) * 0.5 + noise(p * 2.03 + 7.0) * 0.3 + noise(p * 4.1 - uTime * 0.02) * 0.2;
    float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
    float a = smoothstep(0.32, 0.72, n) * edge;
    vec3 col = mix(uTint * 0.86, uTint, n);
    gl_FragColor = vec4(col, a * 0.92);
  }
`;

export type ApproachOptions = { compact: boolean; reduced: boolean };

export class ApproachScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1400);
  private path: THREE.CatmullRomCurve3;
  private look: THREE.CatmullRomCurve3;
  private house = new THREE.Vector3(0, 0, 0);
  private progress = 0;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private raf = 0;
  private visible = true;
  private cloudUniforms = { uTime: { value: 0 }, uTint: { value: new THREE.Vector3(0.96, 0.93, 0.89) } };
  private drift = 0;
  private io: IntersectionObserver;
  private ro: ResizeObserver;

  constructor(private host: HTMLElement, private opts: ApproachOptions) {
    this.renderer = new THREE.WebGLRenderer({ antialias: !opts.compact, powerPreference: "high-performance", stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.compact ? 1 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !opts.compact;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color("#ebe4dc");
    this.scene.fog = new THREE.FogExp2(0xe6ddd3, 0.0021);

    this.buildSky();
    this.buildTerrain(opts.compact ? 120 : 220);
    this.buildRetreat(opts.compact);
    this.buildClouds();
    this.buildLights();

    // the approach: above the cloud, down the valley, to a three-quarter view of the house
    this.path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-24, 42, 236),
      new THREE.Vector3(-12, 27, 150),
      new THREE.Vector3(4, 16, 88),
      new THREE.Vector3(12, 10, 52),
      new THREE.Vector3(14, 8, 40),
    ], false, "centripetal");
    this.look = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 26, -240),
      new THREE.Vector3(0, 13, -110),
      new THREE.Vector3(0, 6, -24),
      new THREE.Vector3(0, 4, -2),
      new THREE.Vector3(0, 3.6, 0),
    ], false, "centripetal");

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.kick(); });
    this.io.observe(host);
    document.addEventListener("visibilitychange", this.kick);
    if (!opts.reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) window.addEventListener("pointermove", this.onPointer, { passive: true });
    this.setProgress(opts.reduced ? 1 : 0);
  }

  private buildSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: `varying vec3 vDir; void main(){ vec3 d = normalize(vDir); float h = d.y;
          vec3 zen = vec3(0.47, 0.6, 0.76), mid = vec3(0.72, 0.78, 0.85), hor = vec3(0.92, 0.85, 0.77);
          vec3 col = mix(hor, mid, smoothstep(-0.02, 0.14, h));
          col = mix(col, zen, smoothstep(0.1, 0.62, h));
          float s = max(dot(d, normalize(vec3(0.8, 0.2, -0.56))), 0.0);
          col += vec3(1.0, 0.82, 0.64) * (pow(s, 5.0) * 0.26 + pow(s, 140.0) * 0.4);
          gl_FragColor = vec4(col, 1.0); }`,
      }),
    );
    this.scene.add(sky);
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,244,228,1)", "rgba(255,210,170,0)"), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    sun.position.set(0.8, 0.2, -0.56).multiplyScalar(800);
    sun.scale.set(130, 130, 1);
    this.scene.add(sun);
  }

  /** A valley floor under cloud, a level ridge for the house, slopes rising to a snow range. */
  private buildTerrain(seg: number) {
    const noise = makeNoise(21);
    const g = new THREE.PlaneGeometry(900, 900, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    // sage meadows (two tones, mixed by noise), muted conifer slopes, warm grey rock, snow with a little warmth
    const meadow = new THREE.Color("#a3a97d"), meadow2 = new THREE.Color("#7f8a62"), forest = new THREE.Color("#46523f"), rock = new THREE.Color("#8a847c"), snow = new THREE.Color("#ece9e4");
    const patches = new Float32Array(pos.count);
    const heights = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const far = clamp((-z - 60) / 260);
      let ridged = 0, amp = 1, f = 0.008;
      for (let o = 0; o < 5; o++) { const n = 1 - Math.abs(noise(x * f + 3.1, z * f + 9.2)); ridged += n * n * amp; amp *= 0.48; f *= 2.05; }
      // the range: tall massifs separated by lower saddles, so it reads as peaks rather than a wall
      const massif = 0.6 + 0.5 * (noise(x * 0.0036 + 7.7, 0.3) * 0.5 + 0.5);
      const range = Math.pow(far, 1.3) * ridged * 100 * massif;
      patches[i] = noise(x * 0.02 + 1.3, z * 0.02 + 4.1) * 0.5 + 0.5;
      const rolling = (noise(x * 0.012, z * 0.012) * 0.5 + 0.5) * 18 + noise(x * 0.05, z * 0.05) * 2.5;
      const valley = Math.exp(-Math.pow(x / 140, 2)) * Math.exp(-Math.pow((z - 90) / 120, 2)) * 26;
      // a level shelf where the house stands, blended into the slope
      const shelf = Math.exp(-((x * x) / 700 + (z * z) / 700));
      let y = rolling - 8 + range - valley;
      y = y * (1 - shelf) + 0 * shelf;
      heights[i] = y;
      pos.setY(i, y);
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal as THREE.BufferAttribute;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = heights[i], slope = 1 - nrm.getY(i);
      c.copy(meadow).lerp(meadow2, patches[i] * 0.7);
      c.lerp(forest, clamp((y - 2) / 14) * 0.85);
      c.lerp(rock, clamp((slope - 0.3) / 0.3) * clamp((y - 8) / 20));
      // snow holds on the upper peaks and in the lee of gentler slopes
      c.lerp(snow, clamp((y - 52) / 18) * (1 - clamp((slope - 0.55) / 0.3) * 0.7));
      // steep ground turns away from the sky and darkens a little
      c.multiplyScalar(1 - clamp(slope / 0.9) * 0.14);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const terrain = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }));
    terrain.receiveShadow = true;
    this.scene.add(terrain);
  }

  private buildRetreat(compact: boolean) {
    const house = buildHouse();
    house.group.rotation.y = 0.35;
    house.windows.color.setRGB(1.0, 0.52, 0.24);
    house.glow.opacity = 0.45;
    this.scene.add(house.group);
    const oak = buildOak(4);
    oak.position.set(-11, 0, 3);
    this.scene.add(oak);
    this.scene.add(buildPines(compact ? 60 : 160, 31, (r) => {
      const a = r() * Math.PI * 2, d = 18 + r() * 110;
      const x = Math.cos(a) * d, z = Math.sin(a) * d - 10;
      // keep the approach corridor and the view to the house open
      if (x > -40 && x < 32 && z > -6) return null;
      if (Math.hypot(x, z) < 16) return null;
      return new THREE.Vector3(x, 0, z);
    }, 0x334236));
  }

  private buildClouds() {
    const m = new THREE.ShaderMaterial({
      uniforms: this.cloudUniforms, transparent: true, depthWrite: false, fog: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: CLOUD_FRAG,
    });
    // the sea of cloud lies in the valley below the ridge: from under the opening camera to the foot of the range
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), m);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -13, 100);
    this.scene.add(sea);
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xd7e0ea, 0x7a6f58, 1.45));
    const sun = new THREE.DirectionalLight(0xffdcb6, 3.3);
    sun.position.set(0.78, 0.36, 0.15).normalize().multiplyScalar(120);
    sun.castShadow = !this.opts.compact;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 30; sc.bottom = -30; sc.near = 10; sc.far = 260;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun, sun.target);
    const lamp = new THREE.PointLight(0xffa860, 14, 16, 1.7);
    lamp.position.set(1, 2.4, 5);
    this.scene.add(lamp);
  }

  setProgress(p: number) {
    this.progress = clamp(p);
    this.kick();
  }

  private onPointer = (e: PointerEvent) => {
    this.pointer.tx = e.clientX / window.innerWidth - 0.5;
    this.pointer.ty = e.clientY / window.innerHeight - 0.5;
    this.kick();
  };

  private kick = () => {
    if (!this.raf && this.visible && !document.hidden) this.raf = requestAnimationFrame(this.frame);
  };

  private frame = (now: number) => {
    this.raf = 0;
    const p = this.progress;
    // glide along the path, easing in and out, with a slight arc round the house at the end
    const along = ease(seg(p, APPROACH.glide));
    const pos = this.path.getPointAt(along);
    const look = this.look.getPointAt(along);
    const arc = ease(seg(p, APPROACH.arc));
    if (arc > 0) {
      const rel = pos.clone().sub(this.house);
      rel.applyAxisAngle(new THREE.Vector3(0, 1, 0), -arc * 0.32);
      pos.copy(this.house).add(rel);
    }
    const ptr = this.pointer;
    const k = this.opts.reduced ? 1 : 0.08;
    ptr.x += (ptr.tx - ptr.x) * k;
    ptr.y += (ptr.ty - ptr.y) * k;
    this.camera.position.set(pos.x + ptr.x * 2.2, pos.y - ptr.y * 1.2, pos.z);
    this.camera.lookAt(look);
    // clouds drift slowly while on screen; the descent also carries them past
    if (!this.opts.reduced) this.drift = now / 1000;
    this.cloudUniforms.uTime.value = this.drift + p * 40;
    this.renderer.render(this.scene, this.camera);
    const easing = Math.abs(ptr.tx - ptr.x) > 1e-3 || Math.abs(ptr.ty - ptr.y) > 1e-3;
    // keep the cloud drift alive at a gentle rate only while above the cloud layer
    if (easing || (!this.opts.reduced && p < 0.5)) this.kick();
  };

  private resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.fov = r.width / r.height < 1 ? 60 : 42;
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener("visibilitychange", this.kick);
    window.removeEventListener("pointermove", this.onPointer);
    disposeScene(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
