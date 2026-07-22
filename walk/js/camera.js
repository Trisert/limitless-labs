// Camera — static viewpoint from refuge terrace near water level
// Reference: Yosemite Valley View at dawn
export function createCameraController() {
  // Fixed position — low, near water, looking across valley
  const basePos = { x: 0.0, y: 8.0, z: 45.0 };
  const baseDir = { x: 0.0, y: -0.06, z: -1.0 }; // slight downward tilt

  // Gentle sway (wind/breathing)
  let time = 0;

  function update(dt) {
    time += dt;
    const swayX = Math.sin(time * 0.3) * 0.02 + Math.sin(time * 0.7) * 0.01;
    const swayY = Math.cos(time * 0.4) * 0.015;
    const swayZ = Math.sin(time * 0.2) * 0.01;

    return {
      pos: {
        x: basePos.x + swayX,
        y: basePos.y + swayY,
        z: basePos.z + swayZ
      },
      dir: {
        x: baseDir.x + swayX * 0.05,
        y: baseDir.y + swayY * 0.03,
        z: baseDir.z
      }
    };
  }

  return { update };
}
