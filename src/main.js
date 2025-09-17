import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { MarchingCubes } from 'https://unpkg.com/three@0.160.0/examples/jsm/objects/MarchingCubes.js';

const app = document.getElementById('app');

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 50);
// Position camera to see the entire lamp
camera.position.set(0.75, 1.0, 2.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1.2;
controls.maxDistance = 5.0;
controls.target.set(0, 0.9, 0);
controls.update();

// Environment for reflections and glass
const pmrem = new PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = env;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.15));
const hemi = new THREE.HemisphereLight(0xff8855, 0x080820, 0.6);
hemi.position.set(0, 2, 0);
scene.add(hemi);

const basePoint = new THREE.PointLight(0xff5522, 1.2, 6, 2);
basePoint.position.set(0, 0.2, 0);
scene.add(basePoint);

// Create a classic lava lamp glass using LatheGeometry
function createLampGlass() {
  // Profile points for lathe (r, y). y up, units in meters-ish.
  const pts = [];
  // Base to mid-bulge to neck to cap
  pts.push(new THREE.Vector2(0.00, 0.00)); // tip bottom
  pts.push(new THREE.Vector2(0.06, 0.02));
  pts.push(new THREE.Vector2(0.14, 0.05));
  pts.push(new THREE.Vector2(0.20, 0.10)); // start widening
  pts.push(new THREE.Vector2(0.24, 0.20));
  pts.push(new THREE.Vector2(0.27, 0.35));
  pts.push(new THREE.Vector2(0.30, 0.55));
  pts.push(new THREE.Vector2(0.31, 0.75)); // bulge
  pts.push(new THREE.Vector2(0.29, 1.00));
  pts.push(new THREE.Vector2(0.22, 1.25)); // neck
  pts.push(new THREE.Vector2(0.18, 1.45));
  pts.push(new THREE.Vector2(0.19, 1.60)); // cap area
  pts.push(new THREE.Vector2(0.16, 1.70));
  pts.push(new THREE.Vector2(0.10, 1.76));

  const geo = new THREE.LatheGeometry(pts, 96);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.05,
    transmission: 1.0,       // glassy transparency
    thickness: 0.5,          // volumetric refraction feel
    ior: 1.45,
    transparent: true,
    opacity: 1.0,
    envMapIntensity: 0.8,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.0;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

// Lamp base and cap for aesthetics
function createLampBaseAndCap() {
  const group = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x22252a, metalness: 0.6, roughness: 0.5 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.7, roughness: 0.35 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.22, 48), baseMat);
  base.position.y = -0.11;

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 0.08, 48), baseMat);
  foot.position.y = -0.25;

  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 0.08, 48), capMat);
  topCap.position.y = 1.78;

  group.add(base, foot, topCap);

  return group;
}

// Marching Cubes Lava
const resolution = 42; // increase for more detail, decrease for speed
const lavaMaterial = new THREE.MeshStandardMaterial({
  color: 0xff3311,
  emissive: new THREE.Color(0.16, 0.04, 0.02),
  metalness: 0.0,
  roughness: 0.35,
  envMapIntensity: 0.1,
  vertexColors: true
});

const mc = new MarchingCubes(resolution, lavaMaterial, false, true, 45000);
mc.isolation = 64; // surface threshold
// Scale and position lava field to sit inside glass
mc.scale.set(0.56, 1.45, 0.56);
mc.position.set(0, 0.88, 0);
scene.add(mc);

// Blobs state
const BLOBS = 16;
const blobs = [];
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

// Color palette gradient (warm reds to oranges)
const palette = [
  new THREE.Color('#ff4d1a'),
  new THREE.Color('#ff6a00'),
  new THREE.Color('#ff8c1a'),
  new THREE.Color('#ff3b2f'),
  new THREE.Color('#ff1e1e')
];

for (let i = 0; i < BLOBS; i++) {
  const phase = Math.random() * Math.PI * 2;
  const speed = lerp(0.12, 0.32, Math.random());
  const color = palette[Math.floor(Math.random() * palette.length)];
  blobs.push({
    x: rnd(-0.25, 0.25),
    y: rnd(-0.7, 0.8),
    z: rnd(-0.25, 0.25),
    vx: rnd(-0.06, 0.06),
    vy: rnd(-0.10, 0.26),
    vz: rnd(-0.06, 0.06),
    radius: lerp(0.04, 0.08, Math.random()),
    phase, speed, color
  });
}

function radiusProfile(y) {
  // y in [-1, 1] in field space; larger radius near middle, smaller at ends
  const center = 0.36;  // max radius at belly
  const ends = 0.21;    // min radius near top/bottom
  const t = (y + 1) * 0.5; // [0..1]
  const bell = 1 - Math.pow((t - 0.5) / 0.5, 2); // parabola peaked at center
  return lerp(ends, center, bell);
}

const subtract = 12; // controls cutoff falloff

function updateLava(dt, t) {
  mc.reset();

  // Gentle convection: updraft near bottom, downdraft near top
  for (let i = 0; i < BLOBS; i++) {
    const b = blobs[i];

    // add some periodic stirring
    const swirl = 0.2 * Math.sin(t * b.speed + b.phase);
    b.vx += 0.10 * dt * Math.sin(t * 0.7 + i);
    b.vz += 0.10 * dt * Math.cos(t * 0.9 + i * 0.3);

    // buoyancy and gravity
    b.vy += 0.25 * dt * (1.0 - Math.max(-1, Math.min(1, b.y))) - 0.18 * dt * (Math.max(-1, Math.min(1, b.y)) + 0.4);

    // damping
    b.vx *= 0.995; b.vy *= 0.996; b.vz *= 0.995;

    // integrate
    b.x += (b.vx + 0.05 * swirl) * dt;
    b.y += b.vy * dt;
    b.z += (b.vz - 0.05 * swirl) * dt;

    // confinement inside a varying radius profile
    const r = radiusProfile(b.y);
    const rad = Math.max(0.05, r - 0.02); // margin from glass
    const d = Math.hypot(b.x, b.z);
    if (d > rad) {
      // push back in and reflect velocity
      const nx = b.x / d, nz = b.z / d;
      b.x = nx * rad;
      b.z = nz * rad;
      const dot = b.vx * nx + b.vz * nz;
      b.vx -= 1.8 * dot * nx;
      b.vz -= 1.8 * dot * nz;
    }

    // top/bottom bounce
    if (b.y > 0.95) { b.y = 0.95; b.vy *= -0.85; }
    if (b.y < -0.95) { b.y = -0.95; b.vy *= -0.6; }

    // strength proportional to radius^2 to maintain volume
    const strength = Math.pow(b.radius * 1.6, 2);

    mc.addBall(b.x, b.y, b.z, strength, subtract, b.color);
  }

  // optional soft floor to keep goo off the very bottom
  // mc.addPlaneY(-0.3, subtract);

  mc.update();
}

// Build the lamp
const glass = createLampGlass();
scene.add(glass);
scene.add(createLampBaseAndCap());

// Post-processing (subtle bloom for glow)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.9, 0.2);
composer.addPass(bloom);

// Overlay text
const overlay = document.createElement('div');
overlay.id = 'overlay';
overlay.innerHTML = '3D Lava Lamp — drag to orbit • wheel to zoom';
document.body.appendChild(overlay);

// Animate
let last = performance.now();
function animate() {
  const now = performance.now();
  const dt = Math.min(0.033, (now - last) / 1000); // clamp dt for stability
  last = now;
  const t = now * 0.001;

  updateLava(dt, t);

  controls.update();
  composer.render();
  requestAnimationFrame(animate);
}

// Resize
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

animate();
