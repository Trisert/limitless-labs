// Limitless Labs — original illustrated diorama for the hero.
// The reference's technique is a layered painted scene, not a WebGL planet:
// poster -> soft drifting mist -> water ripple -> survey arm motion.
const canvas = document.getElementById("orbitCanvas");
const hero = document.getElementById("hero");
const landscape = hero?.querySelector(".landscape");
const loader = hero?.querySelector(".scene-loader");

if (canvas && hero && landscape) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const context = canvas.getContext("2d");
  const logical = { width: 1672, height: 941 };
  const sources = {
    backdrop: hero.dataset.sceneBackdrop,
    cloud: hero.dataset.sceneCloud,
    robot: hero.dataset.sceneRobot,
  };
  let images;
  let frame = 0;
  let visible = true;
  let last = performance.now();
  let time = 0;
  let pointerX = 0;
  let targetPointerX = 0;
  let viewport = { width: 0, height: 0, dpr: 1, scale: 1, left: 0, top: 0 };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });

  function fitViewport() {
    const rect = landscape.getBoundingClientRect();
    if (!rect.width || !rect.height || !context) return false;
    viewport.width = rect.width;
    viewport.height = rect.height;
    viewport.dpr = Math.min(window.devicePixelRatio || 1, 1.35);
    viewport.scale = Math.max(
      rect.width / logical.width,
      rect.height / logical.height,
    );
    viewport.left = logical.width - rect.width / viewport.scale;
    viewport.top = (logical.height - rect.height / viewport.scale) / 2;
    canvas.width = Math.round(rect.width * viewport.dpr);
    canvas.height = Math.round(rect.height * viewport.dpr);
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

  function drawClouds(seconds) {
    // The painted sky already has clouds; these are soft drifting mist
    // layers only, blurred so no hard vector edge shows over the painting.
    const layers = [
      { y: 72, width: 650, alpha: 0.5, speed: 7, offset: 40 },
      { y: 238, width: 340, alpha: 0.38, speed: 14, offset: 530 },
      { y: 305, width: 235, alpha: 0.32, speed: 21, offset: 220 },
    ];
    context.save();
    context.filter = "blur(6px)";
    for (const layer of layers) {
      const height = (layer.width * images.cloud.height) / images.cloud.width;
      const period = 1780;
      const travel = (layer.offset + seconds * layer.speed) % period;
      context.globalAlpha = layer.alpha;
      for (let i = -1; i < 3; i += 1) {
        const x = travel + i * period - 780;
        context.drawImage(images.cloud, x, layer.y, layer.width, height);
      }
    }
    context.restore();
    context.globalAlpha = 1;
  }

  function drawWater(seconds) {
    context.save();
    context.beginPath();
    context.moveTo(700, 815);
    context.lineTo(830, 738);
    context.lineTo(1010, 696);
    context.lineTo(1220, 690);
    context.lineTo(1420, 730);
    context.lineTo(1505, 778);
    context.lineTo(1505, 815);
    context.closePath();
    context.clip();
    context.fillStyle = "rgba(82, 169, 197, 0.22)";
    context.fillRect(650, 660, 900, 160);
    context.lineWidth = 3;
    for (let y = 698; y < 810; y += 18) {
      const shift =
        Math.sin(y * 0.035 + seconds * 1.8) * 8 +
        Math.sin(seconds * 0.7 + y * 0.08) * 3;
      context.strokeStyle = `rgba(193, 230, 218, ${0.14 + (y % 54) / 450})`;
      context.beginPath();
      context.moveTo(750 + shift, y);
      context.quadraticCurveTo(1100 + shift, y - 6, 1450 + shift, y + 3);
      context.stroke();
    }
    context.restore();
  }

  function drawRover(seconds) {
    // On narrow viewports the painted scene carries the hero alone: the
    // sprite would sit under the copy/CTA stack (cover crops to the right).
    if (viewport.width && viewport.width < 700) return;
    const bob = Math.sin(seconds * 1.2) * 2.2;
    const drift = pointerX * 7;
    context.save();
    context.translate(1176 + drift, 443 + bob);
    context.rotate(Math.sin(seconds * 0.42) * 0.018 + pointerX * 0.006);
    context.drawImage(images.robot, 0, 0, 430, 470);
    context.restore();
  }

  function render(seconds) {
    if (!context || !images || !viewport.width || !viewport.height) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    beginSceneTransform();
    context.drawImage(images.backdrop, 0, 0, logical.width, logical.height);
    drawClouds(seconds);
    drawWater(seconds);
    drawRover(seconds);
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  function resize() {
    if (fitViewport()) render(time);
  }

  function tick(now) {
    frame = 0;
    if (!visible || document.hidden || reducedMotion.matches) return;
    const delta = Math.min(0.08, (now - last) / 1000);
    last = now;
    time += delta;
    pointerX += (targetPointerX - pointerX) * 0.035;
    render(time);
    frame = requestAnimationFrame(tick);
  }

  function resume() {
    cancelAnimationFrame(frame);
    last = performance.now();
    if (!reducedMotion.matches && visible && !document.hidden) {
      frame = requestAnimationFrame(tick);
    } else {
      render(0);
    }
  }

  function fail(error) {
    console.warn("Illustrated scene disabled:", error);
    cancelAnimationFrame(frame);
    canvas.remove();
    loader?.remove();
  }

  async function start() {
    try {
      if (!context || Object.values(sources).some((source) => !source))
        throw new Error("Scene assets missing");
      images = Object.fromEntries(
        await Promise.all(
          Object.entries(sources).map(async ([key, source]) => [
            key,
            await loadImage(source),
          ]),
        ),
      );
      new ResizeObserver(resize).observe(landscape);
      window.addEventListener("resize", resize, { passive: true });
      hero.addEventListener("pointermove", (event) => {
        const rect = hero.getBoundingClientRect();
        targetPointerX = (event.clientX - rect.left) / rect.width - 0.5;
      });
      hero.addEventListener("pointerleave", () => {
        targetPointerX = 0;
      });
      reducedMotion.addEventListener("change", resume);
      document.addEventListener("visibilitychange", resume);
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        resume();
      }).observe(hero);
      resize();
      loader?.remove();
      resume();
    } catch (error) {
      fail(error);
    }
  }

  start();
}
