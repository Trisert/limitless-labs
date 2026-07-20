// hero3d.js — Limitless Labs prototype hero
// Earth + orbital rings of satellites, drag to rotate, scroll to descend slightly.
import * as THREE from 'three';

try {
const canvas = document.getElementById('orbitCanvas');
const reduceMotion = window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmall = window.matchMedia('(max-width: 760px)').matches;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 1.2, 6.2);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0x556070, 0.9));
const key = new THREE.DirectionalLight(0xffd27a, 1.4); // amber-ish key
key.position.set(4, 3, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6f93ac, 0.7); // steel rim
rim.position.set(-5, -2, -4);
scene.add(rim);

// ---------- Starfield ----------
function makeStars(count, radius) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * (0.6 + Math.random() * 0.4);
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    pos[i * 3 + 2] = r * Math.cos(p);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x9ba1ab, size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.8 });
  return new THREE.Points(geo, mat);
}
const stars = makeStars(isSmall ? 700 : 1400, 40);
scene.add(stars);

// ---------- Earth (stylized, our palette) ----------
const earthGroup = new THREE.Group();
scene.add(earthGroup);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0x1c2a36, roughness: 0.95, metalness: 0.05, emissive: 0x0a1219, emissiveIntensity: 0.4 })
);
earthGroup.add(earth);

// faint wire latitude/longitude grid to feel "mission control"
const grid = new THREE.Mesh(
  new THREE.SphereGeometry(1.52, 24, 18),
  new THREE.MeshBasicMaterial({ color: 0x6f93ac, wireframe: true, transparent: true, opacity: 0.12 })
);
earthGroup.add(grid);

// amber atmosphere glow
const atm = new THREE.Mesh(
  new THREE.SphereGeometry(1.62, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffb000, transparent: true, opacity: 0.06, side: THREE.BackSide })
);
earthGroup.add(atm);

// ---------- Orbital rings + satellites ----------
const RING_DEFS = [
  { radius: 2.4, count: 7, tilt: 0.35, color: 0xffb000, speed: 0.18 },
  { radius: 3.1, count: 9, tilt: -0.5, color: 0x6f93ac, speed: 0.13 },
  { radius: 3.8, count: 11, tilt: 0.9, color: 0xd6dee5, speed: 0.10 },
];

const rings = [];

RING_DEFS.forEach(def => {
  const group = new THREE.Group();
  group.rotation.x = def.tilt;
  group.rotation.z = def.tilt * 0.4;

  // orbit path (thin ring)
  const path = new THREE.Mesh(
    new THREE.TorusGeometry(def.radius, 0.006, 8, 128),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.25 })
  );
  path.rotation.x = Math.PI / 2;
  group.add(path);

  // satellites
  const sats = [];
  for (let i = 0; i < def.count; i++) {
    const s = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.05, 0),
      new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.8, roughness: 0.4 })
    );
    const a = (i / def.count) * Math.PI * 2;
    s.position.set(Math.cos(a) * def.radius, 0, Math.sin(a) * def.radius);
    group.add(s);
    sats.push(s);
  }
  scene.add(group);
  rings.push({ group, sats, radius: def.radius, speed: def.speed });
});

// ---------- Interaction: drag to orbit, scroll to descend ----------
let dragging = false, px = 0, py = 0;
let targetRotX = 0.25, targetRotY = 0;
let curRotX = 0.25, curRotY = 0;
let autoSpin = reduceMotion ? 0 : 0.0009;

canvas.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; py = e.clientY; });
window.addEventListener('pointerup', () => dragging = false);
window.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - px, dy = e.clientY - py;
  px = e.clientX; py = e.clientY;
  targetRotY += dx * 0.005;
  targetRotX += dy * 0.005;
  targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
});

let scrollDescend = 0;
window.addEventListener('scroll', () => {
  const h = document.getElementById('top');
  const max = h ? h.offsetHeight : 1;
  scrollDescend = Math.min(1, window.scrollY / max);
}, { passive: true });

// ---------- Resize ----------
function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Animate ----------
let last = performance.now();
function animate(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;

  if (!dragging) targetRotY += autoSpin * 60 * dt;
  curRotX += (targetRotX - curRotX) * 0.08;
  curRotY += (targetRotY - curRotY) * 0.08;

  earthGroup.rotation.y = curRotY;
  earthGroup.rotation.x = curRotX;

  rings.forEach(r => {
    r.group.rotation.y += r.speed * dt;
    r.sats.forEach(s => { const s2 = 1 + Math.sin(now * 0.003 + s.position.x) * 0.15; s.scale.setScalar(s2); });
  });

  stars.rotation.y += 0.0004;

  // descend camera slightly on scroll
  camera.position.y = 1.2 - scrollDescend * 1.6;
  camera.position.z = 6.2 + scrollDescend * 1.2;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// fade out the hint after first interaction
} catch (err) {
  // WebGL unavailable or Three failed to load: leave the CSS gradient background.
  console.warn('hero3d disabled:', err);
}
