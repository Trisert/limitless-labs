// Limitless Labs — a small orbital diorama behind the editorial hero.
// It is decorative only: the poster remains useful if WebGL is unavailable.
import * as THREE from "three";

const canvas = document.getElementById("orbitCanvas");
const hero = document.getElementById("hero");
const loader = document.querySelector(".scene-loader");
if (canvas && hero) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const smallScreen = window.matchMedia("(max-width: 600px)");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, smallScreen.matches ? 1.4 : 1.8),
    );
    renderer.setClearColor(0x000000, 0);
  } catch (error) {
    console.warn("Orbital scene disabled:", error);
    loader?.remove();
  }

  if (renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.35, 7.2);

    scene.add(new THREE.HemisphereLight(0xc8f0e2, 0x063442, 1.8));
    const key = new THREE.DirectionalLight(0xffdf9b, 2.4);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9cdbd4, 1.5);
    rim.position.set(5, -1, -3);
    scene.add(rim);

    const orbiting = new THREE.Group();
    orbiting.position.set(1.15, 0.1, 0);
    scene.add(orbiting);

    const planetMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c8791,
      roughness: 0.95,
      metalness: 0,
      emissive: new THREE.Color(0x0a2931),
      emissiveIntensity: 0.28,
    });
    const planet = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.55, 5),
      planetMaterial,
    );
    orbiting.add(planet);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      hero.dataset.earthTexture || "textures/earth-blue-marble.webp",
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        planetMaterial.map = texture;
        planetMaterial.needsUpdate = true;
      },
      undefined,
      () =>
        console.warn("Orbital texture unavailable; using fallback material."),
    );

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.74, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0xb9e6c1,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
      }),
    );
    orbiting.add(halo);

    const ringDefinitions = [
      { radius: 2.15, tube: 0.012, color: 0xd8f1a4, tilt: 0.38, speed: 0.18 },
      { radius: 2.65, tube: 0.009, color: 0xf4c975, tilt: -0.55, speed: -0.12 },
      { radius: 3.2, tube: 0.006, color: 0xb9e6c1, tilt: 0.92, speed: 0.08 },
    ];
    const rings = [];
    for (const definition of ringDefinitions) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(definition.radius, definition.tube, 8, 160),
        new THREE.MeshBasicMaterial({
          color: definition.color,
          transparent: true,
          opacity: 0.65,
        }),
      );
      ring.rotation.x = Math.PI / 2 + definition.tilt;
      ring.rotation.z = definition.tilt * 0.4;
      scene.add(ring);
      rings.push({ ring, speed: definition.speed });
    }

    function satellite(scale = 1) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.16 * scale, 0.2 * scale, 0.2 * scale),
        new THREE.MeshStandardMaterial({
          color: 0xe4eee1,
          roughness: 0.6,
          metalness: 0.2,
        }),
      );
      group.add(body);
      const solar = new THREE.MeshBasicMaterial({ color: 0x234c6a });
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(0.36 * scale, 0.012 * scale, 0.18 * scale),
          solar,
        );
        panel.position.x = side * 0.27 * scale;
        group.add(panel);
      }
      return group;
    }

    const satellites = ringDefinitions.map((definition, index) => {
      const craft = satellite(index === 1 ? 0.8 : 1);
      craft.position.set(1.15 + definition.radius, 0.1, 0.1);
      craft.rotation.z = 0.3;
      scene.add(craft);
      return {
        craft,
        radius: definition.radius,
        speed: definition.speed,
        phase: index * 2.1,
      };
    });

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.25, 2.75, 0.16, 40),
      new THREE.MeshStandardMaterial({
        color: 0x0d5662,
        roughness: 0.9,
        metalness: 0.05,
      }),
    );
    platform.position.set(1.15, -1.68, 0);
    platform.rotation.x = 0.06;
    scene.add(platform);
    const platformLine = new THREE.Mesh(
      new THREE.TorusGeometry(2.26, 0.018, 8, 96),
      new THREE.MeshBasicMaterial({
        color: 0xd8f1a4,
        transparent: true,
        opacity: 0.65,
      }),
    );
    platformLine.position.copy(platform.position);
    platformLine.rotation.copy(platform.rotation);
    scene.add(platformLine);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(
      (smallScreen.matches ? 180 : 360) * 3,
    );
    for (let i = 0; i < starPositions.length; i += 3) {
      const radius = 8 + Math.random() * 10;
      const angle = Math.random() * Math.PI * 2;
      starPositions[i] = Math.cos(angle) * radius;
      starPositions[i + 1] = (Math.random() - 0.5) * 8;
      starPositions[i + 2] = -2 - Math.random() * 5;
    }
    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3),
    );
    scene.add(
      new THREE.Points(
        starGeometry,
        new THREE.PointsMaterial({
          color: 0xd8f1a4,
          size: 0.035,
          transparent: true,
          opacity: 0.8,
        }),
      ),
    );

    let frame = 0;
    let last = performance.now();
    let visible = true;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    function resize() {
      const rect = hero.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      render();
    }
    function render() {
      renderer.render(scene, camera);
    }
    function tick(now) {
      frame = 0;
      if (!visible || document.hidden || reduceMotion.matches) return;
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      currentX += (targetX - currentX) * 0.035;
      currentY += (targetY - currentY) * 0.035;
      orbiting.rotation.x = currentY * 0.3;
      orbiting.rotation.y += 0.08 * delta + currentX * 0.004;
      planet.rotation.y += 0.1 * delta;
      rings.forEach(({ ring, speed }) => {
        ring.rotation.y += speed * delta;
      });
      satellites.forEach(({ craft, radius, speed, phase }) => {
        const angle = (performance.now() / 1000) * speed + phase;
        craft.position.set(
          1.15 + Math.cos(angle) * radius,
          0.1 + Math.sin(angle) * radius * 0.38,
          Math.sin(angle) * 0.75,
        );
        craft.lookAt(1.15, 0.1, 0);
      });
      render();
      frame = requestAnimationFrame(tick);
    }
    function resume() {
      cancelAnimationFrame(frame);
      last = performance.now();
      if (!reduceMotion.matches && visible && !document.hidden)
        frame = requestAnimationFrame(tick);
      else render();
    }

    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      targetX = (event.clientX - rect.left) / rect.width - 0.5;
      targetY = (event.clientY - rect.top) / rect.height - 0.5;
    });
    hero.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
    });
    reduceMotion.addEventListener("change", resume);
    document.addEventListener("visibilitychange", resume);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    }).observe(hero);
    new ResizeObserver(resize).observe(hero);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pagehide", () => cancelAnimationFrame(frame));
    resize();
    resume();
    window.setTimeout(() => loader?.remove(), 1200);
  }
}
