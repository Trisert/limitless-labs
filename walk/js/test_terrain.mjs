#!/usr/bin/env node
import { terrainHeight, WATER_LEVEL } from './terrain.js';

for (const [x, z] of [[0,0],[0,2],[0,5],[0,8],[0,10],[0,12],[0,15],[0,18],[0,20],[0,25],[0,30],[5,0],[-5,0],[0,-5]]) {
  console.log(`terrainAt(${x},${z}) = ${terrainHeight(x,z).toFixed(2)}`);
}
console.log(`WATER_LEVEL = ${WATER_LEVEL}`);
