import * as THREE from 'three';
import { createCameraController } from './camera.js';
import { terrainHeight, WATER_LEVEL } from './terrain.js';

// ============ SHADER LOADING ============
async function loadShader(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load shader: ${url}`);
  return res.text();
}

// Fallback: inline shaders if fetch fails (GitHub Pages MIME issues)
const FALLBACK_VERT = `attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FALLBACK_FRAG = `precision highp float;
varying vec2 vUv;
uniform vec3 uCameraPos;
uniform vec3 uCameraDir;
uniform float uTime;
uniform vec2 uResolution;
const float WATER_LEVEL = 2.5;
const float SNOW_LEVEL = 70.0;
const vec3 SUN_DIR = normalize(vec3(-0.55, 0.04, 0.7));
const vec3 SUN_COLOR = vec3(1.0, 0.5, 0.06);
const vec3 ALPENGLOW_COLOR = vec3(1.0, 0.35, 0.25);
vec2 add = vec2(1.0, 0.0);
#define HASHSCALE1 .1031
#define HASHSCALE3 vec3(.1031, .1030, .0973)
float Hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * HASHSCALE1);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 Hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * HASHSCALE3);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float Noise(in vec2 x) {
  vec2 p = floor(x);
  vec2 f = fract(x);
  f = f*f*(3.0-2.0*f);
  float res = mix(mix(Hash12(p), Hash12(p + add.xy), f.x),
                  mix(Hash12(p + add.yx), Hash12(p + add.xx), f.x), f.y);
  return res;
}
vec2 Noise2(in vec2 x) {
  vec2 p = floor(x);
  vec2 f = fract(x);
  f = f*f*(3.0-2.0*f);
  vec2 res = mix(mix(Hash22(p), Hash22(p + add.xy), f.x),
                 mix(Hash22(p + add.yx), Hash22(p + add.xx), f.x), f.y);
  return res;
}
const mat2 rotate2D = mat2(1.3623, 1.7531, -1.7131, 1.4623);
float Trees(vec2 p) { return Noise(p*13.0) * 0.15; }
float Terrain(in vec2 p) {
  vec2 pos = p*0.05;
  float w = (Noise(pos*.25)*0.75+.15);
  w = 66.0 * w * w;
  float f = .0;
  for (int i = 0; i < 5; i++) {
    f += w * Noise(pos);
    w = -w * 0.4;
    pos = rotate2D * pos;
  }
  float ff = Noise(pos*.002);
  f += pow(abs(ff), 5.0)*275.-5.0;
  float distFromCenter = length(p);
  float lakeRadius = 10.0;
  float lakeDepth = 4.0;
  float lake = smoothstep(lakeRadius, lakeRadius*0.3, distFromCenter) * lakeDepth;
  f -= lake;
  return f;
}
float treeLine;
float treeCol;
float Map(in vec3 p) {
  float h = Terrain(p.xz);
  float ff = Noise(p.xz*.3) + Noise(p.xz*3.3)*.5;
  treeLine = smoothstep(ff, .0+ff*2.0, h) * smoothstep(1.0+ff*3.0, .4+ff, h);
  treeCol = Trees(p.xz);
  h += treeCol;
  return p.y - h;
}
float Terrain2(in vec2 p) {
  vec2 pos = p*0.05;
  float w = (Noise(pos*.25)*0.75+.15);
  w = 66.0 * w * w;
  float f = .0;
  for (int i = 0; i < 5; i++) {
    f += w * Noise(pos);
    w = -w * 0.4;
    pos = rotate2D * pos;
  }
  float ff = Noise(pos*.002);
  f += pow(abs(ff), 5.0)*275.-5.0;
  treeCol = Trees(p);
  f += treeCol;
  if (treeCol > 0.0) return f;
  for (int i = 0; i < 6; i++) {
    f += w * Noise(pos);
    w = -w * 0.4;
    pos = rotate2D * pos;
  }
  return f;
}
float FractalNoise(in vec2 xy) {
  float w = .7;
  float f = 0.0;
  for (int i = 0; i < 4; i++) {
    f += Noise(xy) * w;
    w *= 0.5;
    xy *= 2.7;
  }
  return f;
}
vec3 GetSky(in vec3 rd) {
  float sunAmount = max(dot(rd, SUN_DIR), 0.0);
  float horiz = pow(1.0 - max(rd.y, 0.0), 4.0);
  vec3 horizonCol = vec3(0.85, 0.32, 0.12) * 1.1;
  vec3 zenithCol = vec3(0.06, 0.10, 0.38);
  vec3 sky = mix(zenithCol, horizonCol, horiz * 0.75);
  sky += vec3(1.0, 0.55, 0.12) * pow(sunAmount, 2.5) * 0.5;
  sky += vec3(1.0, 0.85, 0.45) * min(pow(sunAmount, 800.0), 0.6) * 1.0;
  return sky;
}
vec3 GetClouds(in vec3 sky, in vec3 rd) {
  if (rd.y < 0.01) return sky;
  float v = (200.0-uCameraPos.y)/rd.y;
  rd.xz *= v;
  rd.xz += uCameraPos.xz;
  rd.xz *= .010;
  float f = (FractalNoise(rd.xz) -.55) * 5.0;
  float sunAmt = max(dot(rd, SUN_DIR), 0.0);
  vec3 cloudCol = mix(vec3(.55, .55, .52), vec3(1.0, 0.7, 0.4), sunAmt * 0.6);
  sky = mix(sky, cloudCol, clamp(f*rd.y-.1, 0.0, 1.0));
  return sky;
}
vec3 ApplyFog(in vec3 rgb, in float dis, in vec3 dir) {
  float heightFog = exp(-max(uCameraPos.y - 5.0, 0.0) * 0.005);
  float distFog = exp(-dis * 0.000015);
  float fogAmount = distFog * heightFog;
  float sunAmt = max(dot(dir, SUN_DIR), 0.0);
  vec3 fogCol = mix(vec3(0.45, 0.5, 0.65), vec3(1.0, 0.75, 0.5), sunAmt * 0.4);
  return mix(fogCol, rgb, fogAmount);
}
float VolumetricFog(in vec3 pos, in vec3 rd, in float dis) {
  if (dis > 300.0) return 0.0;
  float density = Noise(pos.xz * 0.02 + uTime * 0.01) * 0.5 + 0.5;
  density *= smoothstep(30.0, 0.0, pos.y);
  density *= smoothstep(300.0, 80.0, dis);
  return density * 0.06;
}
float specular = 0.0;
float ambient = 0.25;
void DoLighting(inout vec3 mat, in vec3 pos, in vec3 normal, in vec3 eyeDir, in float dis) {
  float h = dot(SUN_DIR, normal);
  float c = max(h, 0.0) + ambient;
  mat = mat * SUN_COLOR * c;
  if (h > 0.0) {
    vec3 R = reflect(SUN_DIR, normal);
    float specAmount = pow(max(dot(R, normalize(eyeDir)), 0.0), 3.0) * specular;
    mat = mix(mat, SUN_COLOR, specAmount);
  }
}
vec3 GetWaterColor(in vec3 pos, in vec3 dir, in vec3 normal, in float dis) {
  vec3 refl = reflect(dir, normal);
  refl.y = abs(refl.y);
  vec3 skyRefl = GetSky(refl);
  skyRefl = GetClouds(skyRefl, refl);
  float fresnel = pow(1.0 - max(dot(-dir, normal), 0.0), 5.0);
  fresnel = mix(0.02, 1.0, fresnel);
  vec3 waterCol = vec3(0.02, 0.08, 0.12);
  float sunAmount = max(dot(refl, SUN_DIR), 0.0);
  vec3 glitter = SUN_COLOR * pow(sunAmount, 256.0) * 2.0;
  vec3 col = mix(waterCol, skyRefl, fresnel) + glitter;
  float depth = pos.y - WATER_LEVEL;
  col *= exp(-depth * 0.1);
  return col;
}
vec3 TerrainColour(vec3 pos, vec3 normal, float dis) {
  vec3 mat;
  specular = .0;
  ambient = .1;
  vec3 dir = normalize(pos - uCameraPos);
  vec3 matPos = pos * 2.0;
  float disSqrd = dis * dis;
  float f = clamp(Noise(matPos.xz*.05), 0.0, 1.0);
  f += Noise(matPos.xz*.1 + normal.yz*1.08)*.85;
  f *= .55;
  vec3 m = mix(vec3(.63*f+.2, .7*f+.1, .7*f+.1), vec3(f*.43+.1, f*.3+.2, f*.35+.1), f*.65);
  mat = m*vec3(f*m.x+.36, f*m.y+.30, f*m.z+.28);
  if (normal.y < .5) {
    float v = normal.y;
    float c = (.5-normal.y) * 4.0;
    c = clamp(c*c, 0.1, 1.0);
    f = Noise(vec2(matPos.x*.09, matPos.z*.095+matPos.yy*0.15));
    f += Noise(vec2(matPos.x*2.233, matPos.z*2.23))*0.5;
    mat = mix(mat, vec3(.4*f), c);
    specular += .1;
  }
  if (matPos.y < 45.35 && normal.y > .65) {
    m = vec3(Noise(matPos.xz*.023)*.5+.15, Noise(matPos.xz*.03)*.6+.25, 0.0);
    m *= (normal.y - 0.65)*.6;
    mat = mix(mat, m, clamp((normal.y-.65)*1.3 * (45.35-matPos.y)*0.1, 0.0, 1.0));
  }
  if (treeCol > 0.0) {
    mat = vec3(.02+Noise(matPos.xz*5.0)*.03, .05, .0);
    specular = .0;
  }
  if (matPos.y > SNOW_LEVEL && normal.y > .42) {
    float snow = clamp((matPos.y - SNOW_LEVEL - Noise(matPos.xz * .1)*28.0) * 0.035, 0.0, 1.0);
    mat = mix(mat, vec3(.7,.7,.8), snow);
    specular += snow;
    ambient += snow *.3;
  }
  if (matPos.y < 1.45) {
    if (normal.y > .4) {
      f = Noise(matPos.xz * .084)*1.5;
      f = clamp((1.45-f-matPos.y) * 1.34, 0.0, .67);
      float t = (normal.y-.4);
      t = (t*t);
      mat = mix(mat, vec3(.09+t, .07+t, .03+t), f);
    }
  }
  float distToWater = pos.y - WATER_LEVEL;
  if (distToWater < 1.0 && distToWater > -2.0) {
    float time = uTime * 0.03;
    vec3 watPos = pos;
    float wave1 = Noise(watPos.xz * 0.8 + time * 2.0);
    float wave2 = Noise(watPos.xz * 3.0 - time * 1.5);
    vec3 waterNor = normalize(vec3(wave1 * 0.08, 1.0, wave2 * 0.08));
    mat = GetWaterColor(pos, dir, waterNor, dis);
    float foam = smoothstep(1.0, 0.0, abs(distToWater));
    foam *= Noise(pos.xz * 15.0 + uTime * 0.3);
    mat = mix(mat, vec3(0.85, 0.92, 0.95), foam * 0.25);
    DoLighting(mat, pos, waterNor, dir, disSqrd);
  } else {
    DoLighting(mat, pos, normal, dir, disSqrd);
  }
  mat = ApplyFog(mat, disSqrd, dir);
  float volFog = VolumetricFog(pos, dir, dis);
  if (volFog > 0.0) {
    float sunAmt = max(dot(dir, SUN_DIR), 0.0);
    vec3 fogGlow = mix(vec3(0.5, 0.55, 0.7), vec3(1.0, 0.75, 0.5), sunAmt);
    mat = mix(mat, fogGlow, volFog);
  }
  return mat;
}
float BinarySubdivision(in vec3 rO, in vec3 rD, vec2 t) {
  float halfwayT;
  for (int i = 0; i < 5; i++) {
    halfwayT = dot(t, vec2(.5));
    float d = Map(rO + halfwayT*rD);
    t = mix(vec2(t.x, halfwayT), vec2(halfwayT, t.y), step(0.5, d));
  }
  return halfwayT;
}
bool Scene(in vec3 rO, in vec3 rD, out float resT) {
  float t = 0.1;
  float oldT = 0.0;
  float delta = 0.0;
  bool fin = false;
  vec2 distances;
  for(int j=0; j< 150; j++) {
    if (fin || t > 400.0) break;
    vec3 p = rO + t*rD;
    float h = Map(p);
    if(h < 0.5) {
      fin = true;
      distances = vec2(oldT, t);
      break;
    }
    delta = max(0.01, 0.3*h) + (t*0.0065);
    oldT = t;
    t += delta;
  }
  if (fin) resT = BinarySubdivision(rO, rD, distances);
  return fin;
}
void main() {
  vec2 xy = vUv * 2.0 - 1.0;
  xy.x *= uResolution.x / uResolution.y;
  vec3 ro = uCameraPos;
  vec3 ta = ro + uCameraDir;
  vec3 cw = normalize(ta - ro);
  vec3 cp = vec3(0.0, 1.0, 0.0);
  vec3 cu = normalize(cross(cw, cp));
  vec3 cv = normalize(cross(cu, cw));
  vec3 rd = normalize(xy.x * cu + xy.y * cv + 1.5 * cw);
  vec3 col = vec3(0.0);
  float distance;
  if(!Scene(ro, rd, distance)) {
    col = GetSky(rd);
    col = GetClouds(col, rd);
  } else {
    vec3 pos = ro + distance * rd;
    float p = .02 + .00005 * distance * distance;
    vec3 nor = vec3(0.0, Terrain2(pos.xz), 0.0);
    vec3 v2 = nor - vec3(p, Terrain2(pos.xz + vec2(p, 0.0)), 0.0);
    vec3 v3 = nor - vec3(0.0, Terrain2(pos.xz + vec2(0.0, -p)), -p);
    nor = normalize(cross(v2, v3));
    col = TerrainColour(pos, nor, distance);
  }
  col = (1.0 - exp(-col * 2.5)) * 1.05;
  vec2 uv = vUv * 2.0 - 1.0;
  float vign = 1.0 - dot(uv, uv) * 0.15;
  col *= vign;
  gl_FragColor = vec4(col, 1.0);
}`;

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

    let vertSrc, fragSrc;
    try {
      [vertSrc, fragSrc] = await Promise.all([
        loadShader('./shaders/terrain.vert.js'),
        loadShader('./shaders/terrain.frag.js')
      ]);
      console.log('Shaders loaded from files');
    } catch (e) {
      console.warn('Shader fetch failed, using inline fallback:', e.message);
      vertSrc = FALLBACK_VERT;
      fragSrc = FALLBACK_FRAG;
    }

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
