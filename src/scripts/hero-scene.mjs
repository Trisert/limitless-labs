// Limitless Labs — original illustrated hero.
//
// The reference site animates a painted scene with Canvas 2D (no WebGL): the
// artwork carries the composition and the canvas adds motion on top. This port
// keeps that split. The painting is our own generated illustration, exported at
// 2048px so the browser always downscales it, and every animated element here
// is either a vector shape or a gradient sprite — nothing is an upscaled bitmap.
//
// Layers, painted back to front:
//   backdrop painting -> drifting mist -> sun bloom -> cloud shadows ->
//   stream sparkle -> laptop screen -> wind light -> atmosphere.

const canvas = document.getElementById("orbitCanvas");
const hero = document.getElementById("hero");
const landscape = hero?.querySelector(".landscape");
const loader = hero?.querySelector(".scene-loader");

if (canvas && hero && landscape) {
  const context = canvas.getContext("2d");
  const LOGICAL = { width: 1672, height: 941 };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------------------------------------------------------- tuning */

  // Fractions of the logical frame, measured on the shipped painting.
  // `screen` is the laptop display: [[tl], [tr], [br]] in 0..1 coordinates;
  // `paper` is the sheet the painted arm is writing on.
  const SCENE = {
    screen: {
      tl: [0.685, 0.603],
      tr: [0.737, 0.603],
      br: [0.722, 0.679],
      enabled: true,
    },
    paper: { x: 0.769, y: 0.656, width: 0.085, height: 0.046 },
    streamRows: [
      { x0: 0.17, x1: 0.51, y: 0.575, amp: 6, alpha: 0.4 },
      { x0: 0.16, x1: 0.5, y: 0.615, amp: 8, alpha: 0.48 },
      { x0: 0.18, x1: 0.52, y: 0.655, amp: 5, alpha: 0.42 },
      { x: 0.532, y0: 0.56, y1: 0.7, alpha: 0.34, vertical: true },
    ],
    canopy: { x: 0.48, y: 0, width: 0.52, height: 0.55 },
    sun: { x: 0.16, y: 0.15, radius: 0.28 },
  };

  // Handwriting on the painted sheet, in paper-local 0..1 coordinates: three
  // ruled lines of short cursive-ish runs, which read as writing at this size
  // where long zigzags read as a waveform.
  const INK_STROKES = (() => {
    let state = 90210;
    const random = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const strokes = [];
    const lines = [
      { baseline: 0.42, words: 4, width: 0.84 },
      { baseline: 0.62, words: 3, width: 0.68 },
      { baseline: 0.82, words: 2, width: 0.46 },
    ];
    for (const line of lines) {
      // Each word is a cluster of letter-like marks (short rises, curves and
      // occasional descenders) rather than a single wave, which is what makes
      // the result read as writing at paper scale.
      let x = 0.09;
      for (let word = 0; word < line.words; word += 1) {
        const wordWidth = (line.width / line.words) * (0.55 + random() * 0.3);
        const letters = 3 + Math.floor(random() * 3);
        const letterWidth = wordWidth / letters;
        for (let letter = 0; letter < letters; letter += 1) {
          const height = 0.09 + random() * 0.1;
          const descender = random() < 0.22;
          const base = line.baseline;
          const left = x + letter * letterWidth;
          const points = [
            [left, base + (descender ? 0.12 : 0)],
            [left + letterWidth * 0.25, base - height * 0.7],
            [left + letterWidth * 0.5, base + (descender ? 0.1 : 0.02)],
          ];
          if (random() < 0.5) {
            points.push([left + letterWidth * 0.75, base - height * 0.45]);
          }
          strokes.push(points);
        }
        x += wordWidth + 0.035 + random() * 0.02;
      }
    }
    return strokes;
  })();

  // Leaves drifting down the right side of the frame, seeded so the layout is
  // stable between loads while the motion stays continuous.
  const leaves = (() => {
    let state = 4242;
    const random = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return Array.from({ length: 12 }, () => ({
      x: 0.42 + random() * 0.56,
      phase: random(),
      speed: 0.018 + random() * 0.022,
      size: 7 + random() * 9,
      spin: (random() - 0.5) * 1.6,
      drift: (random() - 0.35) * 0.05,
      tint: random(),
    }));
  })();

  const MIST_BANDS = [
    {
      y: 0.1,
      height: 0.16,
      width: 0.62,
      speed: 0.9,
      offset: 0.04,
      alpha: 0.34,
    },
    {
      y: 0.24,
      height: 0.13,
      width: 0.46,
      speed: 1.5,
      offset: 0.42,
      alpha: 0.26,
    },
    { y: 0.46, height: 0.14, width: 0.78, speed: 0.6, offset: 0.7, alpha: 0.2 },
  ];

  /* ------------------------------------------------------------------ utils */

  const clamp = (value, min = 0, max = 1) =>
    value < min ? min : value > max ? max : value;
  const mix = (a, b, t) => a + (b - a) * t;
  const lerpPoint = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

  function seeded(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --------------------------------------------------------------- sprites */

  // Gradient sprite for mist: drawImage of a soft sprite cannot show a path
  // edge, so the bands never betray their bounds over the painting.
  const mistSprite = document.createElement("canvas");
  mistSprite.width = 256;
  mistSprite.height = 128;
  {
    const c = mistSprite.getContext("2d");
    const gradient = c.createRadialGradient(128, 64, 4, 128, 64, 124);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.45, "rgba(248,253,255,0.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 256, 128);
  }

  // Shadow sprite for the cloud shadows drifting over the meadow.
  const shadowSprite = document.createElement("canvas");
  shadowSprite.width = 256;
  shadowSprite.height = 160;
  {
    const c = shadowSprite.getContext("2d");
    const gradient = c.createRadialGradient(128, 80, 8, 128, 80, 150);
    gradient.addColorStop(0, "rgba(8,34,30,0.5)");
    gradient.addColorStop(0.6, "rgba(8,34,30,0.2)");
    gradient.addColorStop(1, "rgba(8,34,30,0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 256, 160);
  }

  /* ---------------------------------------------------------- laptop screen */

  const screenSource = document.createElement("canvas");
  screenSource.width = 512;
  screenSource.height = 320;
  const screenContext = screenSource.getContext("2d");
  let screenStamp = -1;

  function drawScreen(time) {
    const stamp = Math.floor(time * 6);
    if (stamp === screenStamp) return;
    screenStamp = stamp;
    const c = screenContext;
    const font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    c.fillStyle = "#101b25";
    c.fillRect(0, 0, 512, 320);
    c.fillStyle = "#1b2c38";
    c.fillRect(0, 0, 512, 22);
    c.fillStyle = "#2b4150";
    for (let i = 0; i < 3; i += 1) {
      c.beginPath();
      c.arc(15 + i * 13, 11, 3.6, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "#9db4c0";
    c.font = font;
    c.fillText("flight/src/telemetry.rs", 64, 15);

    c.fillStyle = "#16232d";
    c.fillRect(0, 22, 32, 268);
    c.fillStyle = "#54707f";
    for (let i = 0; i < 13; i += 1) c.fillText(String(i + 1), 9, 44 + i * 19);

    // Abstract code: colour bars, no legible source text.
    const code = [
      ["#7fd1c0", 12],
      ["#c9a86a", 74],
      ["#7fd1c0", 46],
      ["#8fb2c9", 132],
      ["#d38f6a", 96],
      ["#8fb2c9", 148],
      ["#7fd1c0", 60],
      ["#c9a86a", 108],
      ["#8fb2c9", 88],
      ["#7fd1c0", 34],
      ["#d38f6a", 126],
      ["#8fb2c9", 72],
      ["#7fd1c0", 44],
    ];
    for (const [index, [color, width]] of code.entries()) {
      const y = 38 + index * 19;
      c.fillStyle = color;
      c.globalAlpha = 0.85;
      c.beginPath();
      c.roundRect(44, y, width, 7, 3);
      c.fill();
      c.globalAlpha = 1;
      if (index === 4 || index === 8) {
        c.fillStyle = "#e6b35c";
        c.beginPath();
        c.roundRect(44 + width + 10, y + 4, 26, 6, 3);
        c.fill();
      }
    }

    c.fillStyle = "#0d1720";
    c.beginPath();
    c.roundRect(262, 34, 234, 124, 6);
    c.fill();
    c.fillStyle = "#7d9aa8";
    c.fillText("TELEMETRY", 272, 52);
    c.strokeStyle = "#6fd6b0";
    c.lineWidth = 2;
    c.beginPath();
    for (let x = 0; x < 220; x += 4) {
      const y =
        118 +
        Math.sin(x * 0.06 + time * 2.4) * 16 +
        Math.sin(x * 0.021 + time * 0.9) * 8;
      if (x === 0) c.moveTo(268 + x, y);
      else c.lineTo(268 + x, y);
    }
    c.stroke();
    c.fillStyle = "#5f7d8c";
    c.fillText(`bus ${(42 + Math.sin(time * 0.7) * 3).toFixed(1)}%`, 272, 148);
    c.fillText(
      `temp ${(21 + Math.sin(time * 0.35) * 1.6).toFixed(1)} C`,
      354,
      148,
    );

    c.fillStyle = "#0d1720";
    c.beginPath();
    c.roundRect(262, 170, 234, 94, 6);
    c.fill();
    c.fillStyle = "#7d9aa8";
    c.fillText("BUILD", 272, 188);
    const lines = [
      "$ cargo build --release",
      "compiling 12 crates",
      "ok in 3.4s",
    ];
    for (const [index, line] of lines.entries()) {
      c.fillStyle = index === 2 ? "#8ee0b4" : "#5f7d8c";
      c.fillText(line, 272, 210 + index * 18);
    }

    c.fillStyle = "#2b4150";
    c.fillRect(0, 292, 512, 28);
    c.fillStyle = "#9db4c0";
    c.fillText("main*", 10, 310);
    c.fillStyle = "#8ee0b4";
    c.fillText("no warnings", 92, 310);
    if (Math.floor(time * 2) % 2 === 0) {
      c.fillStyle = "#e6b35c";
      c.fillRect(206, 300, 7, 12);
    }
  }

  /* ---------------------------------------------------------------- layers */

  function drawMist(time) {
    if (!images.mist) return;
    context.save();
    context.globalCompositeOperation = "screen";
    context.filter = "blur(12px)";
    for (const band of MIST_BANDS) {
      const width = band.width * LOGICAL.width;
      const height = band.height * LOGICAL.height;
      const span = LOGICAL.width + width * 2;
      const travel =
        ((band.offset * span + time * band.speed * 26) % span) - width;
      const y = band.y * LOGICAL.height;
      context.globalAlpha = band.alpha;
      context.drawImage(mistSprite, travel, y, width, height);
    }
    context.filter = "none";
    context.globalAlpha = 1;
    context.restore();
  }

  function drawSunBloom(time) {
    const { x, y, radius } = SCENE.sun;
    const cx = x * LOGICAL.width;
    const cy = y * LOGICAL.height;
    const r = radius * LOGICAL.width;
    const pulse = 1 + Math.sin(time * 0.35) * 0.04;
    context.save();
    context.globalCompositeOperation = "screen";
    const glow = context.createRadialGradient(
      cx,
      cy,
      r * 0.05,
      cx,
      cy,
      r * pulse,
    );
    glow.addColorStop(0, "rgba(255,238,196,0.42)");
    glow.addColorStop(0.4, "rgba(255,232,180,0.16)");
    glow.addColorStop(1, "rgba(255,244,224,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(cx, cy, r * pulse, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawCloudShadows(time) {
    context.save();
    context.globalCompositeOperation = "multiply";
    context.filter = "blur(26px)";
    const shadows = [
      { offset: 0.1, speed: 9, y: 0.74, width: 0.5, height: 0.2, alpha: 0.5 },
      {
        offset: 0.62,
        speed: 6,
        y: 0.86,
        width: 0.62,
        height: 0.24,
        alpha: 0.42,
      },
    ];
    for (const shadow of shadows) {
      const span = LOGICAL.width * 1.6;
      const travel = (shadow.offset * span + time * shadow.speed) % span;
      const width = shadow.width * LOGICAL.width;
      context.globalAlpha = shadow.alpha;
      context.drawImage(
        shadowSprite,
        travel - LOGICAL.width * 0.3,
        shadow.y * LOGICAL.height,
        width,
        shadow.height * LOGICAL.height,
      );
    }
    context.filter = "none";
    context.globalAlpha = 1;
    context.restore();
  }

  function drawSparkles(time) {
    context.save();
    context.globalCompositeOperation = "screen";
    context.fillStyle = "#f4fdf6";
    for (const row of SCENE.streamRows) {
      context.globalAlpha = row.alpha;
      context.beginPath();
      if (row.vertical) {
        const x = row.x * LOGICAL.width;
        const y0 = row.y0 * LOGICAL.height;
        const y1 = row.y1 * LOGICAL.height;
        for (let y = y0; y < y1; y += 22) {
          const wobble = Math.sin(y * 0.06 + time * 2.2) * 3;
          const twinkle = (Math.sin(time * 3.1 + y * 0.09) + 1) / 2;
          context.ellipse(
            x + wobble,
            y,
            1 + twinkle * 0.8,
            4 + twinkle * 4,
            0,
            0,
            Math.PI * 2,
          );
        }
      } else {
        const x0 = row.x0 * LOGICAL.width;
        const x1 = row.x1 * LOGICAL.width;
        const y = row.y * LOGICAL.height;
        for (let x = x0; x < x1; x += 26) {
          const wobble =
            Math.sin(x * 0.05 + time * 1.6) * row.amp +
            Math.sin(time * 0.9 + x * 0.02) * 2;
          const twinkle = (Math.sin(time * 2.3 + x * 0.1) + 1) / 2;
          context.ellipse(
            x,
            y + wobble,
            5 + twinkle * 7,
            1.2 + twinkle * 0.9,
            0,
            0,
            Math.PI * 2,
          );
        }
      }
      context.fill();
    }
    context.restore();
  }

  // Handwriting on the painted sheet: strokes appear left to right, hold, then
  // fade at the end of the cycle, exactly like the reference's ink pass.
  function drawInk(time) {
    const paper = SCENE.paper;
    const period = 24;
    const t = ((time % period) + period) % period;
    const progress = t < 2 ? 0 : t < 11 ? (t - 2) / 9 : 1;
    const fade = t > 21 ? 1 - (t - 21) / 3 : 1;
    const alpha = progress <= 0 || fade <= 0 ? 0 : 0.88 * fade;
    if (!alpha) return;

    const boxX = paper.x * LOGICAL.width;
    const boxY = paper.y * LOGICAL.height;
    const boxW = paper.width * LOGICAL.width;
    const boxH = paper.height * LOGICAL.height;
    const total = INK_STROKES.length;
    const reach = progress * total;

    context.save();
    context.strokeStyle = `rgba(46,56,66,${alpha})`;
    context.lineWidth = 1.7;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const [index, stroke] of INK_STROKES.entries()) {
      const local = Math.min(1, Math.max(0, reach - index));
      if (local <= 0) break;
      const points = stroke.length - 1;
      const drawn = local * points;
      context.beginPath();
      context.moveTo(boxX + stroke[0][0] * boxW, boxY + stroke[0][1] * boxH);
      for (let i = 1; i < stroke.length; i += 1) {
        const from = stroke[i - 1];
        const to = stroke[i];
        const t0 = i - 1;
        if (t0 + 1 <= drawn) {
          context.lineTo(boxX + to[0] * boxW, boxY + to[1] * boxH);
        } else {
          const partial = drawn - t0;
          context.lineTo(
            boxX + (from[0] + (to[0] - from[0]) * partial) * boxW,
            boxY + (from[1] + (to[1] - from[1]) * partial) * boxH,
          );
          break;
        }
      }
      context.stroke();
    }
    context.restore();
  }

  function drawLeaves(time) {
    // Leaves are blurred and slightly translucent: a crisp flat shape at this
    // size reads as a sticker over a painting.
    const tints = [
      ["#9ccb74", "#5f9b4c"],
      ["#7fb85f", "#4c8340"],
      ["#b3d98a", "#78ae5c"],
    ];
    context.save();
    context.filter = "blur(1.6px)";
    for (const leaf of leaves) {
      const fall = (leaf.phase + time * leaf.speed) % 1;
      if (fall > 0.58) continue; // off-tree gap keeps the loop from feeling dense
      const x =
        (leaf.x + Math.sin(time * 0.5 + leaf.phase * 8) * 0.012) *
        LOGICAL.width;
      const y = (fall / 0.58) * LOGICAL.height;
      const angle = time * leaf.spin + leaf.phase * 6;
      const size = leaf.size;
      const [light, dark] = tints[Math.floor(leaf.tint * tints.length)];
      context.save();
      context.translate(x + leaf.drift * y, y);
      context.rotate(angle);
      context.globalAlpha = 0.72 * (1 - fall * 0.3);
      const fill = context.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
      fill.addColorStop(0, light);
      fill.addColorStop(1, dark);
      context.fillStyle = fill;
      context.beginPath();
      context.moveTo(-size, 0);
      context.quadraticCurveTo(0, -size * 0.6, size, 0);
      context.quadraticCurveTo(0, size * 0.5, -size, 0);
      context.closePath();
      context.fill();
      context.restore();
    }
    context.filter = "none";
    context.restore();
  }

  function drawScreenOverlay(time) {
    if (!SCENE.screen.enabled) return;
    const toPixels = (point) => [
      point[0] * LOGICAL.width,
      point[1] * LOGICAL.height,
    ];
    const tl = toPixels(SCENE.screen.tl);
    const tr = toPixels(SCENE.screen.tr);
    const br = toPixels(SCENE.screen.br);
    const bl = [tl[0] + (br[0] - tr[0]), tl[1] + (br[1] - tr[1])];

    // The measured display leaves a sliver of painted bezel showing, so the
    // quad is inflated slightly around its centre before anything is drawn.
    const spread = 1.12;
    const centre = [
      (tl[0] + tr[0] + br[0] + bl[0]) / 4,
      (tl[1] + tr[1] + br[1] + bl[1]) / 4,
    ];
    for (const corner of [tl, tr, br, bl]) {
      corner[0] = centre[0] + (corner[0] - centre[0]) * spread;
      corner[1] = centre[1] + (corner[1] - centre[1]) * spread;
    }

    // Calibration aid: ?debug=1 paints the overlay targets as solid markers so
    // the alignment can be checked against the painted artwork in one shot.
    if (debug) {
      context.save();
      context.fillStyle = "rgba(255,0,140,0.85)";
      context.beginPath();
      context.moveTo(tl[0], tl[1]);
      context.lineTo(tr[0], tr[1]);
      context.lineTo(br[0], br[1]);
      context.lineTo(bl[0], bl[1]);
      context.closePath();
      context.fill();
      const paper = SCENE.paper;
      context.fillStyle = "rgba(0,255,240,0.75)";
      context.fillRect(
        paper.x * LOGICAL.width,
        paper.y * LOGICAL.height,
        paper.width * LOGICAL.width,
        paper.height * LOGICAL.height,
      );
      context.restore();
      return;
    }

    drawScreen(time);

    // Bezel: a slightly larger dark quad under the display hides the seam
    // between our canvas and the painted laptop.
    context.save();
    const expand = (from, to, amount) => {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const length = Math.hypot(dx, dy) || 1;
      return [(-dy / length) * amount, (dx / length) * amount];
    };
    const top = expand(tl, tr, 9);
    const left = expand(tl, bl, 9);
    context.beginPath();
    context.moveTo(tl[0] - top[0] - left[0], tl[1] - top[1] - left[1]);
    context.lineTo(tr[0] + top[0] - left[0], tr[1] + top[1] - left[1]);
    context.lineTo(br[0] + top[0] + left[0], br[1] + top[1] + left[1]);
    context.lineTo(bl[0] - top[0] + left[0], bl[1] - top[1] + left[1]);
    context.closePath();
    const bezel = context.createLinearGradient(tl[0], tl[1], br[0], br[1]);
    bezel.addColorStop(0, "#33424c");
    bezel.addColorStop(1, "#1d2831");
    context.fillStyle = bezel;
    context.fill();
    context.strokeStyle = "rgba(10,18,24,0.6)";
    context.lineWidth = 2;
    context.stroke();

    // Affine mapping of the editor canvas onto the display quad.
    const across = [
      (tr[0] - tl[0]) / screenSource.width,
      (tr[1] - tl[1]) / screenSource.width,
    ];
    const down = [
      (bl[0] - tl[0]) / screenSource.height,
      (bl[1] - tl[1]) / screenSource.height,
    ];
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.transform(
      across[0] * viewport.scale * viewport.dpr,
      across[1] * viewport.scale * viewport.dpr,
      down[0] * viewport.scale * viewport.dpr,
      down[1] * viewport.scale * viewport.dpr,
      (tl[0] - viewport.left) * viewport.scale * viewport.dpr,
      (tl[1] - viewport.top) * viewport.scale * viewport.dpr,
    );
    context.globalAlpha = 0.94;
    context.drawImage(screenSource, 0, 0);
    context.globalAlpha = 1;
    context.restore();
    beginSceneTransform();

    // Glass pass: the painted laptop also shows a sheen and a shadowed inner
    // edge, so the overlay has to be treated the same way or it reads as a
    // flat quad pasted onto the artwork.
    context.save();
    context.beginPath();
    context.moveTo(tl[0], tl[1]);
    context.lineTo(tr[0], tr[1]);
    context.lineTo(br[0], br[1]);
    context.lineTo(bl[0], bl[1]);
    context.closePath();
    context.clip();
    const sheen = context.createLinearGradient(tl[0], tl[1], br[0], bl[1]);
    sheen.addColorStop(0, "rgba(214,238,255,0.16)");
    sheen.addColorStop(0.42, "rgba(214,238,255,0.05)");
    sheen.addColorStop(0.55, "rgba(12,26,34,0.05)");
    sheen.addColorStop(1, "rgba(10,20,28,0.22)");
    context.fillStyle = sheen;
    context.fillRect(tl[0] - 20, tl[1] - 20, 320, 260);
    const inner = context.createRadialGradient(
      (tl[0] + br[0]) / 2,
      (tl[1] + br[1]) / 2,
      12,
      (tl[0] + br[0]) / 2,
      (tl[1] + br[1]) / 2,
      150,
    );
    inner.addColorStop(0, "rgba(0,0,0,0)");
    inner.addColorStop(1, "rgba(8,16,22,0.3)");
    context.fillStyle = inner;
    context.fillRect(tl[0] - 20, tl[1] - 20, 320, 260);
    context.restore();

    // Screen light spilling onto the surrounding wood.
    const glow = context.createRadialGradient(
      (tl[0] + br[0]) / 2,
      (tl[1] + br[1]) / 2,
      10,
      (tl[0] + br[0]) / 2,
      (tl[1] + br[1]) / 2,
      240,
    );
    glow.addColorStop(0, "rgba(140,220,200,0.22)");
    glow.addColorStop(1, "rgba(140,220,200,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc((tl[0] + br[0]) / 2, (tl[1] + br[1]) / 2, 240, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawWindLight(time) {
    const { x, y, width, height } = SCENE.canopy;
    context.save();
    context.globalCompositeOperation = "screen";
    const sweep = Math.sin(time * 0.24) * 0.5 + 0.5;
    const from = x * LOGICAL.width;
    const to = (x + width) * LOGICAL.width;
    const gradient = context.createLinearGradient(
      mix(from, to, sweep - 0.4),
      y * LOGICAL.height,
      mix(from, to, sweep + 0.4),
      (y + height) * LOGICAL.height,
    );
    gradient.addColorStop(0, "rgba(255,250,214,0)");
    gradient.addColorStop(0.5, `rgba(255,250,214,${0.1 + sweep * 0.05})`);
    gradient.addColorStop(1, "rgba(255,250,214,0)");
    context.fillStyle = gradient;
    context.fillRect(
      from,
      y * LOGICAL.height,
      width * LOGICAL.width,
      height * LOGICAL.height,
    );
    context.restore();
  }

  function drawAtmosphere() {
    context.save();
    const haze = context.createLinearGradient(0, 0, 0, LOGICAL.height * 0.66);
    haze.addColorStop(0, "rgba(236,248,253,0.2)");
    haze.addColorStop(0.34, "rgba(236,248,253,0.1)");
    haze.addColorStop(0.68, "rgba(236,248,253,0.02)");
    haze.addColorStop(1, "rgba(236,248,253,0)");
    context.fillStyle = haze;
    context.fillRect(0, 0, LOGICAL.width, LOGICAL.height * 0.66);

    const vignette = context.createRadialGradient(
      LOGICAL.width * 0.62,
      LOGICAL.height * 0.42,
      180,
      LOGICAL.width * 0.62,
      LOGICAL.height * 0.42,
      1180,
    );
    vignette.addColorStop(0, "rgba(8,36,42,0)");
    vignette.addColorStop(1, "rgba(8,36,42,0.24)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, LOGICAL.width, LOGICAL.height);
    context.restore();
  }

  /* ------------------------------------------------------------- lifecycle */

  let images = null;
  let frame = 0;
  let visible = true;
  let last = 0;
  let time = 0;
  let pointer = 0;
  let pointerTarget = 0;
  let failed = false;
  const debug = new URLSearchParams(window.location.search).has("debug");
  const viewport = { width: 0, height: 0, dpr: 1, scale: 1, left: 0, top: 0 };

  function fitViewport() {
    const rect = landscape.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    viewport.width = rect.width;
    viewport.height = rect.height;
    viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewport.scale = Math.max(
      rect.width / LOGICAL.width,
      rect.height / LOGICAL.height,
    );
    viewport.left = LOGICAL.width - rect.width / viewport.scale;
    viewport.top = (LOGICAL.height - rect.height / viewport.scale) / 2;
    const width = Math.round(rect.width * viewport.dpr);
    const height = Math.round(rect.height * viewport.dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return true;
  }

  function beginSceneTransform() {
    context.setTransform(
      viewport.scale * viewport.dpr,
      0,
      0,
      viewport.scale * viewport.dpr,
      -viewport.left * viewport.scale * viewport.dpr,
      -viewport.top * viewport.scale * viewport.dpr,
    );
  }

  function render(seconds) {
    if (!images || failed || !viewport.width || !viewport.height) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    beginSceneTransform();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.drawImage(images.backdrop, 0, 0, LOGICAL.width, LOGICAL.height);
    context.save();
    context.translate(pointer * 8, 0);
    drawMist(seconds);
    context.restore();
    drawSunBloom(seconds);
    drawCloudShadows(seconds);
    drawSparkles(seconds);
    drawScreenOverlay(seconds);
    drawInk(seconds);
    drawLeaves(seconds);
    drawWindLight(seconds);
    drawAtmosphere();
  }

  function resize() {
    if (failed) return;
    if (fitViewport()) render(time);
  }

  function tick(now) {
    frame = 0;
    if (failed) return;
    if (!visible || document.hidden || reducedMotion.matches) return;
    if (!last) last = now;
    if (now - last >= 1000 / 30) {
      time += Math.min((now - last) / 1000, 0.12);
      last = now;
      pointer += (pointerTarget - pointer) * 0.04;
      render(time);
    }
    frame = requestAnimationFrame(tick);
  }

  function resume() {
    cancelAnimationFrame(frame);
    last = 0;
    if (!failed && !reducedMotion.matches && visible && !document.hidden) {
      frame = requestAnimationFrame(tick);
    } else if (!failed) {
      render(time);
    }
  }

  function fail(error) {
    console.warn("Illustrated scene disabled:", error);
    failed = true;
    cancelAnimationFrame(frame);
    canvas.remove();
    loader?.remove();
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${source}`));
      image.src = source;
    });
  }

  async function start() {
    try {
      if (!context) throw new Error("Canvas 2D unavailable");
      const source = hero.dataset.sceneBackdrop;
      if (!source) throw new Error("Scene artwork missing");
      const backdrop = await loadImage(source);
      images = { backdrop, mist: true };
      fitViewport();

      // Deterministic frame hook: ?frame=<seconds> paints one static frame at
      // that time instead of animating. It is what the poster renderer and the
      // visual QA pass use, so both see exactly the same pixels.
      const requested = Number(
        new URLSearchParams(window.location.search).get("frame"),
      );
      if (Number.isFinite(requested) && requested >= 0) {
        time = requested;
        render(time);
        loader?.remove();
        new ResizeObserver(() => {
          if (fitViewport()) render(time);
        }).observe(landscape);
        window.addEventListener("resize", () => {
          if (fitViewport()) render(time);
        });
        return;
      }

      new ResizeObserver(resize).observe(landscape);
      window.addEventListener("resize", resize, { passive: true });
      hero.addEventListener("pointermove", (event) => {
        const rect = hero.getBoundingClientRect();
        pointerTarget = (event.clientX - rect.left) / rect.width - 0.5;
      });
      hero.addEventListener("pointerleave", () => {
        pointerTarget = 0;
      });
      reducedMotion.addEventListener("change", resume);
      document.addEventListener("visibilitychange", resume);
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        resume();
      }).observe(hero);
      render(0);
      loader?.remove();
      resume();
    } catch (error) {
      fail(error);
    }
  }

  start();
}
