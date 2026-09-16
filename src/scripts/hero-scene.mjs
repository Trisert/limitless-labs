// Limitless Labs — a source-anchored animated painting.
//
// The poster remains the canonical artwork. The canvas samples that same image
// into a few transparent layers, then gives the canopy, water and robot's work
// cycle their own motion. Nothing is placed in viewport coordinates, so the
// animation stays attached when object-fit crops the painting.

const canvas = document.getElementById("orbitCanvas");
const hero = document.getElementById("hero");
const landscape = hero?.querySelector(".landscape");
const poster = landscape?.querySelector(".scene-poster, #scene-poster");
const loader = hero?.querySelector(".scene-loader");

if (canvas && hero && landscape) {
  const context = canvas.getContext("2d");
  const sourceCanvas = document.createElement("canvas");
  const sourceContext = sourceCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  const LOGICAL = { width: 1672, height: 941 };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const viewport = { width: 0, height: 0, dpr: 1, scale: 1, left: 0, top: 0 };
  const PERIOD = 18;
  const bounds = {
    canopy: { x: 380, y: 0, width: 1292, height: 490 },
    water: { x: 0, y: 565, width: 1080, height: 310 },
  };

  let canopyLayer;
  let waterLayer;
  let frameId = 0;
  let lastPaint = 0;
  let visible = true;
  let time = 0;
  let frozen = false;
  let failed = false;

  const clamp = (value, min = 0, max = 1) =>
    value < min ? min : value > max ? max : value;
  const ease = (value) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const lerp = (a, b, amount) => a + (b - a) * amount;

  function positionRatio(token, available, fallback) {
    const value = token?.toLowerCase();
    if (value === "left" || value === "top") return 0;
    if (value === "center") return 0.5;
    if (value === "right" || value === "bottom") return 1;
    if (value?.endsWith("%")) return clamp(Number.parseFloat(value) / 100);
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

  function createSourceLayer(name, region, alphaForPixel) {
    const layer = document.createElement("canvas");
    layer.width = region.width;
    layer.height = region.height;
    layer.dataset.layer = name;
    const layerContext = layer.getContext("2d", { willReadFrequently: true });
    layerContext.drawImage(
      sourceCanvas,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      region.width,
      region.height,
    );
    const pixels = layerContext.getImageData(0, 0, region.width, region.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const red = pixels.data[index];
      const green = pixels.data[index + 1];
      const blue = pixels.data[index + 2];
      pixels.data[index + 3] = Math.round(
        255 * alphaForPixel(red, green, blue, index / 4, region.width),
      );
    }
    layerContext.putImageData(pixels, 0, 0);
    return layer;
  }

  function createSourceLayers() {
    sourceCanvas.width = LOGICAL.width;
    sourceCanvas.height = LOGICAL.height;
    sourceContext.clearRect(0, 0, LOGICAL.width, LOGICAL.height);
    sourceContext.drawImage(poster, 0, 0, LOGICAL.width, LOGICAL.height);

    canopyLayer = createSourceLayer(
      "canopy",
      bounds.canopy,
      (red, green, blue, index, width) => {
        const x = index % width;
        const y = Math.floor(index / width);
        const greenLead = green - Math.max(red, blue);
        const saturation =
          Math.max(red, green, blue) - Math.min(red, green, blue);
        const edgeFade =
          clamp((greenLead - 2) / 26) * clamp((saturation - 18) / 88);
        const topFade = y < 34 ? 0.82 + (y / 34) * 0.18 : 1;
        const sideFade = x < 36 ? x / 36 : 1;
        return edgeFade * topFade * sideFade;
      },
    );

    waterLayer = createSourceLayer(
      "water",
      bounds.water,
      (red, green, blue, index, width) => {
        const x = index % width;
        const y = Math.floor(index / width);
        const blueLead = blue - red;
        const coolLead = blue - green;
        const riverHue =
          clamp((blueLead + 1) / 34) * clamp((coolLead + 1) / 30);
        const bankFade =
          clamp((y - 8) / 22) * clamp((bounds.water.height - y) / 34);
        const edgeFade = clamp((x + 18) / 60) * clamp((width - x + 18) / 75);
        return riverHue * bankFade * edgeFade * 0.92;
      },
    );
  }

  function drawCanopyMotion(seconds) {
    if (!canopyLayer) return;
    const region = bounds.canopy;
    context.save();
    context.globalAlpha = 0.92;
    const stripHeight = 12;
    for (let y = 0; y < region.height; y += stripHeight) {
      const height = Math.min(stripHeight, region.height - y);
      const depth = y / region.height;
      const sway =
        Math.sin(seconds * 0.82 + y * 0.027) * (2.3 + depth * 3.7) +
        Math.sin(seconds * 0.37 + y * 0.011) * (0.8 + depth * 1.5);
      context.drawImage(
        canopyLayer,
        0,
        y,
        region.width,
        height,
        region.x + sway,
        region.y + y,
        region.width,
        height,
      );
    }
    context.restore();
  }

  function drawWaterMotion(seconds) {
    if (!waterLayer) return;
    const region = bounds.water;
    context.save();
    context.globalAlpha = 0.94;
    const stripHeight = 4;
    for (let y = 0; y < region.height; y += stripHeight) {
      const height = Math.min(stripHeight, region.height - y);
      const shift =
        Math.sin(y * 0.11 + seconds * 2.15) * 3.8 +
        Math.sin(y * 0.31 - seconds * 1.35) * 1.4;
      context.drawImage(
        waterLayer,
        0,
        y,
        region.width,
        height,
        region.x + shift,
        region.y + y,
        region.width,
        height,
      );
    }
    context.restore();
  }

  function robotPose(seconds) {
    const phase = ((seconds % PERIOD) + PERIOD) % PERIOD;
    const home = [1328, 750];
    const paper = [1248, 826];
    let grip = home;
    let writing = false;
    let progress = 0;

    if (phase < 2) {
      grip = home;
    } else if (phase < 5) {
      const amount = ease((phase - 2) / 3);
      grip = [lerp(home[0], paper[0], amount), lerp(home[1], paper[1], amount)];
    } else if (phase < 12) {
      writing = true;
      progress = ease((phase - 5) / 7);
      grip = [paper[0] + Math.sin(progress * Math.PI * 4) * 28, paper[1]];
    } else if (phase < 15) {
      const amount = ease((phase - 12) / 3);
      grip = [lerp(paper[0], home[0], amount), lerp(paper[1], home[1], amount)];
    }

    return { phase, grip, progress, writing };
  }

  function drawWritingTrace(progress, opacity) {
    const points = [
      [1218, 838],
      [1240, 832],
      [1261, 840],
      [1284, 833],
      [1307, 840],
    ];
    const distance = (points.length - 1) * progress;
    const segment = Math.min(points.length - 2, Math.floor(distance));
    const fraction = distance - segment;

    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = opacity;
    context.strokeStyle = "rgba(255, 227, 157, 0.78)";
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(...points[0]);
    for (let index = 1; index <= segment; index += 1) {
      context.lineTo(...points[index]);
    }
    const start = points[segment];
    const end = points[segment + 1];
    context.lineTo(
      lerp(start[0], end[0], fraction),
      lerp(start[1], end[1], fraction),
    );
    context.stroke();
    context.restore();
  }

  function drawRobotCycle(seconds) {
    const state = robotPose(seconds);
    const base = [1532, 874];
    const elbow = [1453, 616];
    const pulse = 0.5 + Math.sin(seconds * 3.2) * 0.5;

    context.save();
    context.globalCompositeOperation = "screen";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = `rgba(239, 246, 204, ${0.12 + pulse * 0.1})`;
    context.lineWidth = 2.4;
    context.beginPath();
    context.moveTo(...base);
    context.lineTo(...elbow);
    context.lineTo(...state.grip);
    context.stroke();

    const glow = context.createRadialGradient(
      state.grip[0],
      state.grip[1],
      0,
      state.grip[0],
      state.grip[1],
      14,
    );
    glow.addColorStop(0, `rgba(255, 223, 125, ${0.4 + pulse * 0.22})`);
    glow.addColorStop(0.32, `rgba(255, 204, 92, ${0.16 + pulse * 0.1})`);
    glow.addColorStop(1, "rgba(255, 204, 92, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(state.grip[0], state.grip[1], 14, 0, Math.PI * 2);
    context.fill();
    context.restore();

    if (state.writing) drawWritingTrace(state.progress, 0.44 + pulse * 0.18);
  }

  function paint(seconds) {
    if (failed || !viewport.width || !viewport.height) return;
    clearCanvas();
    if (reducedMotion.matches) return;
    drawCanopyMotion(seconds);
    drawWaterMotion(seconds);
    drawRobotCycle(seconds);
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

  function waitForPoster() {
    if (!poster) return Promise.reject(new Error("Scene poster unavailable"));
    if (poster.complete && poster.naturalWidth) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Scene poster unavailable"));
      };
      const cleanup = () => {
        poster.removeEventListener("load", onLoad);
        poster.removeEventListener("error", onError);
      };
      poster.addEventListener("load", onLoad, { once: true });
      poster.addEventListener("error", onError, { once: true });
    });
  }

  async function start() {
    try {
      if (!context || !sourceContext) throw new Error("Canvas 2D unavailable");
      if (!fitViewport()) throw new Error("Scene viewport unavailable");
      await waitForPoster();

      createSourceLayers();

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
