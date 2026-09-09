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

test("hero scene remains self-contained and has a poster fallback", () => {
  assert.match(scene, /from ["']three["']/);
  assert.match(scene, /hero\.dataset\.earthTexture/);
  assert.match(homepage, /class="hero-poster"/);
  assert.match(scene, /prefers-reduced-motion/);
});
