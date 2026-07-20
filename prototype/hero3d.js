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

// ---- Planet: real Earth texture (Blue Marble) + day/night via lighting ----
const texLoader = new THREE.TextureLoader();
const earthTex = texLoader.load('textures/earth-blue-marble.jpg');
earthTex.colorSpace = THREE.SRGBColorSpace;
earthTex.anisotropy = 4;

const planetMat = new THREE.MeshStandardMaterial({
  map: earthTex,
  roughness: 1.0,
  metalness: 0.0,
  emissive: new THREE.Color(0x0a0f16),   // dark side faint glow
  emissiveIntensity: 0.35
});
const planet = new THREE.Mesh(new THREE.SphereGeometry(1.5, 64, 64), planetMat);
earthGroup.add(planet);

// ---------- Orbital rings + satellites (PocketQube: cube + solar panels) ----------
function makePocketQube(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xb9c0c8, roughness: 0.5, metalness: 0.3 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1b2c4a, emissive: 0x0a1830, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.2 });

  // main cube (5cm unit)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), bodyMat);
  g.add(body);

  // two solar panels (flat boxes) on X sides
  const panelGeo = new THREE.BoxGeometry(0.11, 0.04, 0.005);
  const pL = new THREE.Mesh(panelGeo, panelMat); pL.position.x = -0.085;
  const pR = new THREE.Mesh(panelGeo, panelMat); pR.position.x = 0.085;
  g.add(pL); g.add(pR);

  // accent ring in orbit color
  const accent = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.006, 6, 16),
    new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.9, roughness: 0.4 })
  );
  g.add(accent);

  return g;
}

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
    const s = makePocketQube(def.color);
    const a = (i / def.count) * Math.PI * 2;
    s.position.set(Math.cos(a) * def.radius, 0, Math.sin(a) * def.radius);
    s.rotation.y = a;  // face along orbit
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
let autoSpin = 0.0009;  // gentle constant spin (independent of reduced-motion)

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
  if (!w || !h) return;            // layout not ready yet
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
// Re-fit once layout settles (handles headless / late mobile layout)
if ('ResizeObserver' in window) {
  new ResizeObserver(resize).observe(canvas);
}
setTimeout(resize, 300);

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
    r.sats.forEach(s => { s.rotation.y += dt * 0.6; });
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
