// Camera controllers for walk page
import { terrainHeight, WATER_LEVEL } from './terrain.js';

// ============================================================
// REFUGE — panoramic view from shelter terrace
// ============================================================
function createRefugeCamera() {
  const basePos = { x: 0.0, y: 8.0, z: 45.0 };
  const baseDir = { x: 0.0, y: -0.06, z: -1.0 };

  let time = 0;

  function update(dt) {
    time += dt;

    // Slow panoramic sweep: ±20° horizontal over ~90-second cycle
    const panAngle = Math.sin(time * 0.07) * 0.35;
    const cosA = Math.cos(panAngle), sinA = Math.sin(panAngle);
    const dirX = baseDir.x * cosA - baseDir.z * sinA;
    const dirZ = baseDir.x * sinA + baseDir.z * cosA;

    // Gentle sway
    const swayX = Math.sin(time * 0.3) * 0.02 + Math.sin(time * 0.7) * 0.01;
    const swayY = Math.cos(time * 0.4) * 0.015;
    const swayZ = Math.sin(time * 0.2) * 0.3;

    return {
      pos: { x: basePos.x + swayX, y: basePos.y + swayY, z: basePos.z + swayZ },
      dir: { x: dirX + swayX * 0.03, y: baseDir.y + swayY * 0.03, z: dirZ }
    };
  }

  return { update, label: 'Rifugio' };
}

// ============================================================
// WALK — immersive first-person walk through the terrain
// ============================================================
function createWalkCamera() {
  // Path parameters — gentle meander through the scene
  const pathRadius = 30;
  const pathSpeed = 0.04;
  const eyeHeight = 1.7; // eye level above terrain
  let time = 0;

  function update(dt) {
    time += dt;

    // Position along path
    const t = time * pathSpeed;
    const cx = pathRadius * Math.sin(t * 0.8) * Math.cos(t * 0.3);
    const cz = pathRadius * Math.sin(t * 0.5) * Math.cos(t * 0.4);

    // Sample terrain at several points to avoid clipping
    const sampleRadius = 1.0;
    const samples = [
      [cx, cz],
      [cx + sampleRadius, cz],
      [cx - sampleRadius, cz],
      [cx, cz + sampleRadius],
      [cx, cz - sampleRadius]
    ];
    let maxHeight = -100;
    for (const [sx, sz] of samples) {
      const h = terrainHeight(sx, sz);
      if (h > maxHeight) maxHeight = h;
    }

    const y = Math.max(maxHeight + eyeHeight, WATER_LEVEL + eyeHeight);

    // Look-ahead point for direction
    const laT = (time + 1.0) * pathSpeed;
    const laX = pathRadius * Math.sin(laT * 0.8) * Math.cos(laT * 0.3);
    const laZ = pathRadius * Math.sin(laT * 0.5) * Math.cos(laT * 0.4);

    // Direction: look toward a point slightly ahead and at eye level
    const laY = terrainHeight(laX, laZ) + eyeHeight;
    const dx = laX - cx, dy = laY - y, dz = laZ - cz;
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz);

    // Head bob
    const bob = Math.sin(time * 4.0) * 0.03;

    return {
      pos: { x: cx, y: y + Math.sin(time * 3.0) * bob, z: cz },
      dir: { x: dx/len, y: dy/len + bob * 1.5 - 0.12, z: dz/len }
    };
  }

  return { update, label: 'Camminata' };
}

// ============================================================
// Controller manager
// ============================================================
let activeMode = 'refuge';

const cameras = {
  refuge: createRefugeCamera(),
  walk: createWalkCamera()
};

export function getCameraUpdate(dt) {
  return cameras[activeMode].update(dt);
}

export function switchCamera(mode) {
  if (cameras[mode]) {
    activeMode = mode;
    return true;
  }
  return false;
}

export function getCameraLabel() {
  return cameras[activeMode].label;
}

export function getActiveMode() {
  return activeMode;
}
