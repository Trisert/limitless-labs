// Terrain height sampling for camera placement (JS mirror of GLSL)
const rot2D = [1.3623, 1.7531, -1.7131, 1.4623];

function hash12(px, py) {
  let p3x = (px * 0.1031) % 1; if (p3x < 0) p3x += 1;
  let p3y = (py * 0.1031) % 1; if (p3y < 0) p3y += 1;
  const d = p3x * p3y + p3y * p3x + 19.19 * (p3x + p3y);
  return d - Math.floor(d);
}

function noise2d(x, y) {
  const ix = Math.floor(x) | 0, iy = Math.floor(y) | 0;
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const h1 = hash12(ix, iy);
  const h2 = hash12(ix + 1, iy);
  const h3 = hash12(ix, iy + 1);
  const h4 = hash12(ix + 1, iy + 1);
  return h1 + (h2 - h1) * ux + (h3 - h1) * uy + (h1 - h2 - h3 + h4) * ux * uy;
}

export function terrainHeight(x, z) {
  let px = x * 0.05, pz = z * 0.05;
  let w = (noise2d(px * 0.25, pz * 0.25) * 0.75 + 0.15);
  w = 66.0 * w * w;
  let f = 0.0;
  for (let i = 0; i < 5; i++) {
    f += w * noise2d(px, pz);
    w = -w * 0.4;
    const nx = rot2D[0] * px + rot2D[1] * pz;
    const nz = rot2D[2] * px + rot2D[3] * pz;
    px = nx; pz = nz;
  }
  f += Math.pow(Math.abs(noise2d(px * 0.002, pz * 0.002)), 5.0) * 275 - 5.0;
  return f;
}

// Water level for lake/river — must match GLSL
export const WATER_LEVEL = 0.0;
