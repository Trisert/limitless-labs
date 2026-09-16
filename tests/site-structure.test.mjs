import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const homepage = await readFile("src/pages/index.astro", "utf8");
const scene = await readFile("src/scripts/hero-scene.mjs", "utf8");

test("homepage uses Nicola content and keeps the reference structure", () => {
  assert.match(homepage, /Flight software that has to be right/);
  assert.match(homepage, /Raspberry Pi agent fleet/);
  assert.match(homepage, /What I.?m/);
  assert.doesNotMatch(homepage, /Varun|Avici|fixmahbug|varunlohade/);
});

test("hero scene is a transparent atmospheric enhancement over one canonical painting", () => {
  assert.match(scene, /getContext\("2d"\)/);
  assert.match(scene, /poster\?\.decode/);
  assert.match(scene, /prefers-reduced-motion/);
  assert.match(scene, /drawAmbientLight/);
  assert.match(scene, /drawWaterGlints/);
  assert.match(scene, /clearCanvas/);
  assert.match(scene, /getComputedStyle\(poster\)\.objectPosition/);
  assert.match(scene, /requestAnimationFrame/);
  assert.match(scene, /hero\.classList\.add\("scene-ready"\)/);
  assert.match(scene, /requested !== null && Number\.isFinite\(requested\)/);
  assert.match(scene, /URLSearchParams\(window\.location\.search\)/);
  assert.doesNotMatch(
    scene,
    /drawImage|drawBackdrop|drawLeaves|drawScreenOverlay|drawInk|drawMist/,
  );
  assert.match(homepage, /class="landscape"/);
  assert.match(homepage, /class="scene-poster"|id="scene-poster"/);
  assert.match(homepage, /art\/backdrop\.jpg/);
  assert.doesNotMatch(homepage, /scene-poster\.jpg|hero-readout/);
});
