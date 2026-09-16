// Limitless Labs — a quiet, painted hero scene.
//
// The artwork stays still. Motion is reserved for two things that belong to the
// landscape: a slow change in daylight and short glints moving along the water.
// Keeping the raster intact avoids seams, drifting edges and fake UI layered over
// objects that were never designed to move.

const canvas = document.getElementById("orbitCanvas");
const hero = document.getElementById("hero");
const landscape = hero?.querySelector(".landscape");
const poster = landscape?.querySelector(".scene-poster");
const loader = hero?.querySelector(".scene-loader");

if (canvas && hero && landscape) {
  const context = canvas.getContext("2d");
  const LOGICAL = { width: 1672, height: 941 };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const viewport = { width: 0, height: 0, dpr: 1, scale: 1, left: 0, top: 0 };
  const waterRows = [
    { x0: 0.16, x1: 0.52, y: 0.576, phase: 0.05, speed: 0.13 },
    { x0: 0.17, x1: 0.5, y: 0.616, phase: 0.48, speed: 0.1 },
    { x0: 0.19, x1: 0.51, y: 0.654, phase: 0.82, speed: 0.16 },
    {
      x: 0.536,
      y0: 0.565,
      y1: 0.704,
      phase: 0.28,
      speed: 0.08,
      vertical: true,
    },
  ];

  let frameId = 0;
  let lastPaint = 0;
  let visible = true;
  let time = 0;
  let frozen = false;
  let failed = false;

  const clamp = (value, min = 0, max = 1) =>
    value < min ? min : value > max ? max : value;

  function positionRatio(token, available, fallback) {
    const value = token?.toLowerCase();
    if (value === "left" || value === "top") return 0;
    if (value === "center") return 0.5;
    if (value === "right" || value === "bottom") return 1;
    if (value?.endsWith("%")) {
      return clamp(Number.parseFloat(value) / 100);
    }
    const pixels = Number.parseFloat(value);
    return Number.isFinite(pixels) && available
      ? clamp(pixels / available)
      : fallback;
  }

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
    const visibleWidth = rect.width / viewport.scale;
    const visibleHeight = rect.height / viewport.scale;
    const sourceWidth = LOGICAL.width - visibleWidth;
    const sourceHeight = LOGICAL.height - visibleHeight;
    const objectPosition = poster
      ? getComputedStyle(poster).objectPosition.split(/\s+/)
      : [];
    viewport.left =
      sourceWidth * positionRatio(objectPosition[0], sourceWidth, 1);
    viewport.top =
      sourceHeight * positionRatio(objectPosition[1], sourceHeight, 0.5);

    const width = Math.max(1, Math.round(rect.width * viewport.dpr));
    const height = Math.max(1, Math.round(rect.height * viewport.dpr));
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

  function clearCanvas() {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    beginSceneTransform();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
  }

  function drawAmbientLight(seconds) {
    const pulse = 0.5 + Math.sin(seconds * 0.18 - 0.6) * 0.5;
    const drift = Math.sin(seconds * 0.07) * 34;
    const x = LOGICAL.width * 0.18 + drift;
    const y = LOGICAL.height * 0.16;
    const radius = LOGICAL.width * 0.43;

    context.save();
    context.globalCompositeOperation = "screen";
    const glow = context.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(255, 245, 196, ${0.045 + pulse * 0.035})`);
    glow.addColorStop(0.48, `rgba(255, 238, 178, ${0.018 + pulse * 0.012})`);
    glow.addColorStop(1, "rgba(255, 238, 178, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, LOGICAL.width, LOGICAL.height);

    // A second, cooler pass makes the canopy breathe without drawing a visible
    // geometric mask across the painting.
    const canopy = context.createRadialGradient(
      LOGICAL.width * 0.79,
      LOGICAL.height * 0.18,
      0,
      LOGICAL.width * 0.79,
      LOGICAL.height * 0.18,
      LOGICAL.width * 0.52,
    );
    canopy.addColorStop(0, `rgba(211, 245, 196, ${0.018 + pulse * 0.018})`);
    canopy.addColorStop(1, "rgba(211, 245, 196, 0)");
    context.fillStyle = canopy;
    context.fillRect(0, 0, LOGICAL.width, LOGICAL.height * 0.74);

    // A broad, slow shaft of light crosses only the painted canopy. It gives the
    // scene a readable beat without moving the tree, typography or workbench.
    const sweep = (seconds * 0.035) % 1;
    const beamX = LOGICAL.width * (0.42 + sweep * 0.64);
    context.save();
    context.beginPath();
    context.moveTo(LOGICAL.width * 0.34, 0);
    context.lineTo(LOGICAL.width, 0);
    context.lineTo(LOGICAL.width, LOGICAL.height * 0.6);
    context.lineTo(LOGICAL.width * 0.77, LOGICAL.height * 0.5);
    context.lineTo(LOGICAL.width * 0.61, LOGICAL.height * 0.38);
    context.lineTo(LOGICAL.width * 0.47, LOGICAL.height * 0.34);
    context.closePath();
    context.clip();
    const beam = context.createLinearGradient(
      beamX - LOGICAL.width * 0.16,
      0,
      beamX + LOGICAL.width * 0.16,
      LOGICAL.height * 0.56,
    );
    beam.addColorStop(0, "rgba(255, 244, 190, 0)");
    beam.addColorStop(0.5, `rgba(255, 244, 190, ${0.1 + pulse * 0.06})`);
    beam.addColorStop(1, "rgba(255, 244, 190, 0)");
    context.fillStyle = beam;
    context.fillRect(0, 0, LOGICAL.width, LOGICAL.height * 0.66);
    context.restore();
    context.restore();
  }

  function drawWaterGlints(seconds) {
    context.save();
    context.globalCompositeOperation = "screen";
    context.lineCap = "round";
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(LOGICAL.width * 0.08, LOGICAL.height * 0.55);
    context.bezierCurveTo(
      LOGICAL.width * 0.2,
      LOGICAL.height * 0.53,
      LOGICAL.width * 0.43,
      LOGICAL.height * 0.56,
      LOGICAL.width * 0.54,
      LOGICAL.height * 0.62,
    );
    context.bezierCurveTo(
      LOGICAL.width * 0.59,
      LOGICAL.height * 0.67,
      LOGICAL.width * 0.57,
      LOGICAL.height * 0.74,
      LOGICAL.width * 0.42,
      LOGICAL.height * 0.75,
    );
    context.bezierCurveTo(
      LOGICAL.width * 0.25,
      LOGICAL.height * 0.72,
      LOGICAL.width * 0.11,
      LOGICAL.height * 0.66,
      LOGICAL.width * 0.08,
      LOGICAL.height * 0.55,
    );
    context.closePath();
    context.clip();

    for (const row of waterRows) {
      const progress = (seconds * row.speed + row.phase) % 1;
      const length = 0.11;
      const start = progress * (1 + length) - length;
      const end = start + length;
      const from = row.vertical ? row.y0 : row.x0;
      const to = row.vertical ? row.y1 : row.x1;
      const head = from + (to - from) * clamp(start);
      const tail = from + (to - from) * clamp(end);
      const fade = Math.sin(Math.PI * clamp((progress + 0.12) % 1));
      const alpha = 0.11 + fade * 0.13;

      context.strokeStyle = `rgba(233, 255, 231, ${alpha})`;
      context.beginPath();
      if (row.vertical) {
        const x = row.x * LOGICAL.width;
        context.moveTo(x, head * LOGICAL.height);
        context.lineTo(x, tail * LOGICAL.height);
      } else {
        const y = row.y * LOGICAL.height;
        const startX = head * LOGICAL.width;
        const endX = tail * LOGICAL.width;
        const offset = Math.sin(seconds * 0.8 + row.phase) * 1.2;
        context.moveTo(startX, y + offset);
        context.lineTo(endX, y + offset);
      }
      context.stroke();
    }
    context.restore();
  }

  function paint(seconds) {
    if (failed || !viewport.width || !viewport.height) return;
    clearCanvas();
    if (!reducedMotion.matches) {
      drawAmbientLight(seconds);
      drawWaterGlints(seconds);
    }
  }

  function stop() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    lastPaint = 0;
  }

  function tick(now) {
    frameId = 0;
    if (
      failed ||
      frozen ||
      !visible ||
      document.hidden ||
      reducedMotion.matches
    ) {
      return;
    }
    if (!lastPaint || now - lastPaint >= 1000 / 30) {
      const elapsed = lastPaint ? (now - lastPaint) / 1000 : 0;
      time += Math.min(elapsed, 0.12);
      lastPaint = now;
      paint(time);
    }
    frameId = window.requestAnimationFrame(tick);
  }

  function syncPlayback() {
    stop();
    if (failed || frozen) return;
    if (reducedMotion.matches || document.hidden || !visible) {
      paint(time);
      return;
    }
    frameId = window.requestAnimationFrame(tick);
  }

  function resize() {
    if (failed) return;
    if (fitViewport()) paint(time);
  }

  function fail(error) {
    console.warn("Illustrated scene disabled:", error);
    failed = true;
    stop();
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "none";
    loader?.setAttribute("hidden", "");
    hero.classList.add("scene-fallback");
  }

  async function start() {
    try {
      if (!context) throw new Error("Canvas 2D unavailable");
      if (!fitViewport()) throw new Error("Scene viewport unavailable");

      // The poster is the canonical scene. The canvas is only an enhancement
      // layer, so decode it before revealing the transparent overlay.
      if (poster?.decode) await poster.decode().catch(() => {});

      // Deterministic frame hook used by poster rendering and visual QA.
      const frameParam = new URLSearchParams(window.location.search).get(
        "frame",
      );
      const requested =
        frameParam === null || frameParam.trim() === ""
          ? null
          : Number(frameParam);
      if (requested !== null && Number.isFinite(requested) && requested >= 0) {
        time = requested;
        frozen = true;
      }

      paint(time);
      hero.classList.add("scene-ready");
      loader?.setAttribute("hidden", "");

      const observer = new ResizeObserver(resize);
      observer.observe(landscape);
      window.addEventListener("resize", resize, { passive: true });
      document.addEventListener("visibilitychange", syncPlayback);
      reducedMotion.addEventListener("change", syncPlayback);
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        syncPlayback();
      }).observe(hero);
      syncPlayback();
    } catch (error) {
      fail(error);
    }
  }

  start();
}
