// Camera — viewpoint from refuge terrace with slow panoramic pan
// Reference: Yosemite Valley View at dawn
export function createCameraController() {
  const basePos = { x: 0.0, y: 3.5, z: 10.0 };
  const baseDir = { x: 0.0, y: -0.1, z: -1.0 };

  let time = 0;

  function update(dt) {
    time += dt;

    // Slow panoramic sweep: ±20° horizontal over ~90-second cycle
    const panAngle = Math.sin(time * 0.07) * 0.35;

    // Rotate base direction around Y axis
    const cosA = Math.cos(panAngle);
    const sinA = Math.sin(panAngle);
    const dirX = baseDir.x * cosA - baseDir.z * sinA;
    const dirZ = baseDir.x * sinA + baseDir.z * cosA;

    // Gentle sway (wind/breathing)
    const swayX = Math.sin(time * 0.3) * 0.02 + Math.sin(time * 0.7) * 0.01;
    const swayY = Math.cos(time * 0.4) * 0.015;
    const swayZ = Math.sin(time * 0.2) * 0.3;

    return {
      pos: {
        x: basePos.x + swayX,
        y: basePos.y + swayY,
        z: basePos.z + swayZ
      },
      dir: {
        x: dirX + swayX * 0.03,
        y: baseDir.y + swayY * 0.03,
        z: dirZ
      }
    };
  }

  return { update };
}
