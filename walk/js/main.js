import * as THREE from 'three';
import { createCameraController } from './camera.js';
import { terrainHeight, WATER_LEVEL } from './terrain.js';

// ============ SHADER LOADING ============
async function loadShader(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load shader: ${url}`);
  return res.text();
}

// ============ MAIN SETUP ============
const canvas = document.getElementById('walk-canvas');
const loading = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});

if (!renderer.capabilities.isWebGL2) {
  loading.textContent = 'WEBGL UNAVAILABLE — try a modern browser';
  throw new Error('WebGL2 not supported');
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0b0d0f, 1);
renderer.shadowMap.enabled = false;
renderer.onerror = (e) => {
  console.error('WebGL error:', e);
  loading.textContent = 'RENDER ERROR — refresh';
};

console.log('WebGL renderer initialized');

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, -1);
camera.updateMatrixWorld();

// Fullscreen triangle
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));

// ============ MATERIAL & UNIFORMS ============
let material;
let cameraController;

async function init() {
  try {
    loading.textContent = 'LOADING SHADERS...';

    const [vertSrc, fragSrc] = await Promise.all([
      loadShader('./shaders/terrain.vert.glsl'),
      loadShader('./shaders/terrain.frag.glsl')
    ]);

    material = new THREE.RawShaderMaterial({
      vertexShader: vertSrc,
      fragmentShader: fragSrc,
      uniforms: {
        uCameraPos: { value: new THREE.Vector3(0, 8, 45) },
        uCameraDir: { value: new THREE.Vector3(0, -0.06, -1).normalize() },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      },
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, material);
    scene.add(mesh);

    cameraController = createCameraController();

    loading.textContent = 'GENERATING WORLD...';

    // Start render loop
    requestAnimationFrame(() => {
      canvas.classList.add('ready');
      loading.classList.add('hidden');
      tick();
    });

  } catch (e) {
    console.error('Init error:', e);
    loading.textContent = 'LOAD ERROR — check console';
  }
}

// ============ RENDER LOOP ============
let lastTime = performance.now();
let totalTime = 0;

function tick() {
  try {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    totalTime += dt;

    // Update camera
    const cam = cameraController.update(dt);
    material.uniforms.uCameraPos.value.set(cam.pos.x, cam.pos.y, cam.pos.z);
    material.uniforms.uCameraDir.value.set(cam.dir.x, cam.dir.y, cam.dir.z).normalize();
    material.uniforms.uTime.value = totalTime;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  } catch (e) {
    console.error('CRITICAL ERROR in tick():', e);
    loading.textContent = 'RUNTIME ERROR — check console';
    loading.style.opacity = 1;
    loading.style.pointerEvents = 'auto';
  }
}

// ============ RESIZE ============
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

// ============ START ============
init();

// Fallback hide loading
setTimeout(() => loading.classList.add('hidden'), 5000);
