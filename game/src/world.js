// DRAGONFIRE — the Golden Souk: a bright Middle Eastern city, 70 x 50 m.
// Sandstone walls, gold and teal domes, white minarets, arched gateways,
// a colourful bazaar, palm trees — and above it all a fire-breathing dragon
// and two helicopters, while two buildings burn. Flat ground, AABB colliders
// only. Dragons spawn south, Djinn north; site A (Dome Plaza) is north-east,
// site B (Palace Gate) north-west. Procedural canvas textures, bright sun,
// sky dome, flame and smoke particle systems.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { mulberry32, TAU } from './utils.js';

function canvasTexture(size, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function noiseOn(ctx, size, rng, base, spots, alpha) {
  for (let i = 0; i < spots; i += 1) {
    const v = base + Math.floor(rng() * 36) - 18;
    ctx.fillStyle = `rgba(${v},${Math.max(0, v - 20)},${Math.max(0, v - 60)},${alpha})`;
    ctx.fillRect(rng() * size, rng() * size, 2 + rng() * 14, 2 + rng() * 14);
  }
}

export function createWorld(scene) {
  const rng = mulberry32(2026);
  const group = new THREE.Group();
  scene.add(group);

  // ---- procedural textures ----
  const sandTex = canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#e8c890'; ctx.fillRect(0, 0, s, s);
    noiseOn(ctx, s, rng, 210, 900, 0.22);
    ctx.strokeStyle = 'rgba(160,120,60,0.4)'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      ctx.beginPath();
      const x = rng() * s, y = rng() * s;
      ctx.moveTo(x, y); ctx.lineTo(x + (rng() - 0.5) * 180, y + (rng() - 0.5) * 180); ctx.stroke();
    }
  }, 7, 5);
  const tileTex = canvasTexture(256, (ctx, s) => {
    // turquoise / gold / terracotta mosaic
    const cols = ['#18b8c8', '#ffc233', '#e86a28', '#f5ead0', '#18c8a8', '#e83a8c'];
    const n = 8, cell = s / n;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        ctx.fillStyle = cols[(i * 3 + j * 5) % cols.length];
        ctx.fillRect(i * cell, j * cell, cell, cell);
        ctx.strokeStyle = 'rgba(255,248,234,0.85)'; ctx.lineWidth = 2;
        ctx.strokeRect(i * cell + 1, j * cell + 1, cell - 2, cell - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.arc(i * cell + cell / 2, j * cell + cell / 2, cell * 0.16, 0, 7); ctx.fill();
      }
    }
  }, 6, 4);
  const sandstoneTex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#e0c090'; ctx.fillRect(0, 0, s, s);
    noiseOn(ctx, s, rng, 210, 500, 0.25);
    ctx.fillStyle = 'rgba(150,110,60,0.35)';
    for (let y = 0; y < s; y += 42) ctx.fillRect(0, y, s, 3);
  }, 2, 1);
  const whiteTex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#f5ead0'; ctx.fillRect(0, 0, s, s);
    noiseOn(ctx, s, rng, 235, 320, 0.2);
    ctx.fillStyle = 'rgba(24,184,200,0.85)';
    ctx.fillRect(0, s - 26, s, 26);
    ctx.fillStyle = 'rgba(255,194,51,0.9)';
    ctx.fillRect(0, s - 34, s, 8);
  }, 1, 1);
  function awningTex(c1, c2) {
    return canvasTexture(128, (ctx, s) => {
      for (let x = 0; x < s; x += 32) {
        ctx.fillStyle = (x / 32) % 2 === 0 ? c1 : c2;
        ctx.fillRect(x, 0, 32, s);
      }
    }, 1, 1);
  }
  const woodTex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#8a5a28'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 42) {
      ctx.fillStyle = `rgba(40,24,8,${0.25 + rng() * 0.2})`;
      ctx.fillRect(0, y, s, 4);
    }
  }, 1, 1);
  const flameTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,240,180,1)');
    g.addColorStop(0.4, 'rgba(255,160,40,0.85)');
    g.addColorStop(1, 'rgba(255,80,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const smokeTex = (() => {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(70,64,58,0.8)');
    g.addColorStop(0.6, 'rgba(60,56,50,0.45)');
    g.addColorStop(1, 'rgba(50,46,42,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  const mats = {
    sand: new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95, metalness: 0.02 }),
    tile: new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.85, metalness: 0.05 }),
    sandstone: new THREE.MeshStandardMaterial({ map: sandstoneTex, roughness: 0.9, metalness: 0.02 }),
    sandDark: new THREE.MeshStandardMaterial({ color: PALETTE.sandstoneDark, roughness: 0.95 }),
    white: new THREE.MeshStandardMaterial({ map: whiteTex, roughness: 0.85 }),
    gold: new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.25, metalness: 0.75, emissive: PALETTE.goldDark, emissiveIntensity: 0.25 }),
    turquoise: new THREE.MeshStandardMaterial({ color: PALETTE.turquoise, roughness: 0.3, metalness: 0.5, emissive: PALETTE.turquoiseDark, emissiveIntensity: 0.3 }),
    magenta: new THREE.MeshStandardMaterial({ color: PALETTE.magenta, roughness: 0.6, metalness: 0.1 }),
    orange: new THREE.MeshStandardMaterial({ color: PALETTE.orange, roughness: 0.6 }),
    teal: new THREE.MeshStandardMaterial({ color: PALETTE.teal, roughness: 0.6 }),
    violet: new THREE.MeshStandardMaterial({ color: PALETTE.violet, roughness: 0.6 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.9 }),
    palm: new THREE.MeshStandardMaterial({ color: PALETTE.palmGreen, roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.95 }),
    metal: new THREE.MeshStandardMaterial({ color: PALETTE.metal, roughness: 0.5, metalness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a241e, roughness: 0.9 }),
    awningM: new THREE.MeshStandardMaterial({ map: awningTex('#e83a8c', '#ffd98a'), roughness: 0.85, side: THREE.DoubleSide }),
    awningO: new THREE.MeshStandardMaterial({ map: awningTex('#ff7a28', '#18b8c8'), roughness: 0.85, side: THREE.DoubleSide }),
    awningT: new THREE.MeshStandardMaterial({ map: awningTex('#18c8a8', '#ffc233'), roughness: 0.85, side: THREE.DoubleSide }),
    charred: new THREE.MeshStandardMaterial({ color: 0x1e1812, roughness: 0.95 }),
    emberGlow: new THREE.MeshStandardMaterial({ color: 0x30160a, emissive: PALETTE.flame, emissiveIntensity: 2.4 }),
  };

  const colliders = [];

  function box(w, h, d, x, y, z, mat, collide = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats[mat]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (collide) {
      colliders.push(new THREE.Box3(
        new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
        new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2),
      ));
    }
    return mesh;
  }
  function cyl(rt, rb, h, x, y, z, mat, seg = 12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mats[mat]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function dome(r, x, y, z, mat) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, TAU, 0, Math.PI / 2), mats[mat]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }
  // An arched gateway: two pillars + a lintel, leaving a walk-through opening.
  function arch(x, z, w, h, mat, rotY = 0) {
    const g = new THREE.Group();
    const pillar = new THREE.BoxGeometry(0.7, h, 0.7);
    const left = new THREE.Mesh(pillar, mats[mat]);
    left.position.set(-w / 2, h / 2, 0);
    const right = new THREE.Mesh(pillar, mats[mat]);
    right.position.set(w / 2, h / 2, 0);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.8, 0.9), mats[mat]);
    lintel.position.set(0, h + 0.4, 0);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, TAU, 0, Math.PI / 2), mats.gold);
    cap.position.set(0, h + 0.8, 0);
    g.add(left, right, lintel, cap);
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    group.add(g);
    // colliders for the two pillars only — the opening stays walkable
    colliders.push(new THREE.Box3(new THREE.Vector3(x - w / 2 - 0.35, 0, z - 0.35), new THREE.Vector3(x - w / 2 + 0.35, h, z + 0.35)));
    colliders.push(new THREE.Box3(new THREE.Vector3(x + w / 2 - 0.35, 0, z - 0.35), new THREE.Vector3(x + w / 2 + 0.35, h, z + 0.35)));
  }
  function minaret(x, z, h) {
    cyl(0.55, 0.7, h, x, h / 2, z, 'white', 10);
    cyl(0.9, 0.9, 0.5, x, h + 0.2, z, 'turquoise', 10);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 10), mats.gold);
    top.position.set(x, h + 1.2, z);
    top.castShadow = true;
    group.add(top);
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.6, 0, z - 0.6), new THREE.Vector3(x + 0.6, h, z + 0.6)));
  }
  function palm(x, z) {
    cyl(0.22, 0.32, 4.6, x, 2.3, z, 'trunk', 8);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 4), mats.palm);
      frond.position.set(x + Math.cos(a) * 1.1, 4.9, z + Math.sin(a) * 1.1);
      frond.rotation.z = Math.cos(a) * 1.1;
      frond.rotation.x = -Math.sin(a) * 1.1;
      frond.castShadow = true;
      group.add(frond);
    }
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.3, 0, z - 0.3), new THREE.Vector3(x + 0.3, 4.6, z + 0.3)));
  }
  // Bazaar stall: counter, four posts, a striped awning.
  function stall(x, z, mat, rotY = 0) {
    const g = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 1.4), mats.wood);
    counter.position.y = 0.5;
    g.add(counter);
    for (const [px, pz] of [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), mats.trunk);
      post.position.set(px, 1.2, pz);
      g.add(post);
    }
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), mats[mat]);
    awn.rotation.x = -Math.PI / 2 + 0.18;
    awn.position.y = 2.45;
    g.add(awn);
    // colourful goods on the counter
    const goods = [mats.magenta, mats.orange, mats.teal, mats.gold, mats.violet];
    for (let i = 0; i < 5; i += 1) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.32), goods[i % goods.length]);
      b.position.set(-1 + i * 0.5, 1.12, (rng() - 0.5) * 0.6);
      g.add(b);
    }
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    group.add(g);
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 1.3, 0, z - 0.7), new THREE.Vector3(x + 1.3, 1.1, z + 0.7)));
  }

  // ---- ground: sand + a mosaic courtyard in the middle ----
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 110), mats.sand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(26, 18), mats.tile);
  court.rotation.x = -Math.PI / 2;
  court.position.set(0, 0.02, 2);
  court.receiveShadow = true;
  group.add(court);

  // ---- perimeter (70 x 50 playfield, sandstone walls 5 m) ----
  box(71.2, 5, 0.6, 0, 2.5, -25.3, 'sandstone');
  box(71.2, 5, 0.6, 0, 2.5, 25.3, 'sandstone');
  box(0.6, 5, 51.2, -35.3, 2.5, 0, 'sandstone');
  box(0.6, 5, 51.2, 35.3, 2.5, 0, 'sandstone');
  // white trim + gold caps along the north wall
  box(71.2, 0.5, 0.8, 0, 5.1, -25.3, 'white', false);
  box(71.2, 0.5, 0.8, 0, 5.1, 25.3, 'white', false);

  // ---- mid / A-long divider (x = 22) with two arch doors ----
  box(0.6, 4, 6, 22, 2, -5, 'sandstone');
  box(0.6, 4, 7, 22, 2, 4.5, 'sandstone');
  box(0.6, 4, 3, 22, 2, 12.5, 'sandstone');
  // ---- mid / B-short divider (x = -22) ----
  box(0.6, 4, 6, -22, 2, -5, 'sandstone');
  box(0.6, 4, 7, -22, 2, 4.5, 'sandstone');
  box(0.6, 4, 3, -22, 2, 12.5, 'sandstone');
  // ---- site fronts (z = -8) with one arch door each ----
  box(4, 4, 0.6, 10, 2, -8, 'white');
  box(7, 4, 0.6, 18.5, 2, -8, 'white');
  box(7, 4, 0.6, -18.5, 2, -8, 'white');
  box(4, 4, 0.6, -10, 2, -8, 'white');
  arch(14, -8, 2.6, 3.2, 'sandstone', Math.PI / 2);
  arch(-14, -8, 2.6, 3.2, 'sandstone', Math.PI / 2);

  // ---- mid fountain + colourful crates ----
  cyl(1.6, 1.8, 0.9, 0, 0.45, 0, 'turquoise', 12);
  cyl(1.1, 1.1, 0.5, 0, 1.1, 0, 'gold', 12);
  const crateCols = ['magenta', 'orange', 'teal', 'gold', 'violet', 'turquoise'];
  const crateSpots = [[-6, 2], [6, -2], [0, 8], [-9, -5], [9, -5], [-4, -6], [4, 6]];
  crateSpots.forEach(([cx, cz], i) => box(1.2, 1.2, 1.2, cx, 0.6, cz, crateCols[i % crateCols.length]));
  box(2.4, 1.2, 1.2, -4, 0.6, -6, 'wood');
  box(2.4, 1.2, 1.2, 4, 0.6, 6, 'wood');

  // ---- A-long / B-short cover crates ----
  box(1.2, 1.2, 1.2, 27, 0.6, 4, 'orange');
  box(1.2, 1.2, 1.2, 30, 0.6, -2, 'teal');
  box(2.4, 1.2, 1.2, 26, 0.6, 10, 'magenta');
  box(1.2, 1.2, 1.2, -27, 0.6, 4, 'violet');
  box(1.2, 1.2, 1.2, -30, 0.6, -2, 'gold');
  box(2.4, 1.2, 1.2, -26, 0.6, 10, 'turquoise');

  // ---- site A: Dome Plaza (gold dome + minarets) ----
  box(7, 5, 4, 27, 2.5, -20, 'white');
  cyl(2.2, 2.4, 1.2, 27, 5.6, -20, 'sandstone', 12);
  dome(2.6, 27, 6.2, -20, 'gold');
  cyl(0.18, 0.18, 1.2, 27, 9.0, -20, 'gold', 6);
  minaret(22.5, -22.5, 8);
  minaret(31.5, -22.5, 8);
  box(1.2, 1.2, 1.2, 19, 0.6, -12, 'orange');
  box(1.2, 1.2, 1.2, 31, 0.6, -12, 'teal');
  box(2.4, 1.2, 1.2, 22, 0.6, -21, 'wood');
  box(0.9, 1.1, 0.9, 20, 0.55, -18, 'metal');
  box(0.9, 1.1, 0.9, 32, 0.55, -18, 'metal');

  // ---- site B: Palace Gate (teal dome + white walls + gate arch) ----
  box(6, 2.6, 2.6, -27, 1.3, -18.7, 'white');
  box(4, 2.6, 2.6, -20, 1.3, -19.7, 'sandstone');
  box(4.4, 2.6, 2.4, -27, 3.9, -18.7, 'sandstone');
  cyl(1.8, 2.0, 1.0, -27, 5.6, -18.7, 'sandstone', 12);
  dome(2.1, -27, 6.1, -18.7, 'turquoise');
  arch(-25, -14, 3.2, 3.6, 'white', 0);
  box(1.2, 1.2, 1.2, -19, 0.6, -12, 'magenta');
  box(1.2, 1.2, 1.2, -31, 0.6, -12, 'gold');
  box(2.4, 1.2, 1.2, -24, 0.6, -21, 'wood');
  box(10, 0.4, 6, -25, 4.6, -18, 'wood'); // canopy over the gate

  // ---- bazaar stalls + palms ----
  stall(-6, 8, 'awningM', 0.3);
  stall(6, 8, 'awningO', -0.3);
  stall(-12, -2, 'awningT', 1.2);
  stall(12, -2, 'awningM', -1.2);
  stall(0, 14, 'awningO', 0);
  palm(-14, 14);
  palm(14, 14);
  palm(-32, 8);
  palm(32, 8);
  palm(-32, -6);
  palm(32, -6);

  // ---- spawn cover ----
  box(1.2, 1.2, 1.2, 8, 0.6, 18, 'orange');
  box(1.2, 1.2, 1.2, -8, 0.6, 18, 'teal');
  box(2.4, 1.2, 1.2, 0, 0.6, 21, 'wood');
  box(1.2, 1.2, 1.2, 8, 0.6, -18, 'magenta');
  box(1.2, 1.2, 1.2, -8, 0.6, -18, 'gold');
  box(2.4, 1.2, 1.2, 0, 0.6, -21, 'wood');

  // ---- BURNING BUILDINGS: two sandstone houses on fire ----
  // House 1 (east, near A-long): charred walls, glowing embers, fire inside.
  box(5, 3.6, 4, 30, 1.8, 8, 'charred');
  box(5.4, 0.5, 4.4, 30, 3.8, 8, 'charred');
  const ember1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.3), mats.emberGlow);
  ember1.position.set(30, 1.4, 5.9);
  group.add(ember1);
  // House 2 (west, near B-short): same treatment.
  box(5, 3.6, 4, -30, 1.8, 8, 'charred');
  box(5.4, 0.5, 4.4, -30, 3.8, 8, 'charred');
  const ember2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.3), mats.emberGlow);
  ember2.position.set(-30, 1.4, 5.9);
  group.add(ember2);
  const fireLights = [];
  for (const [fx, fz] of [[30, 8], [-30, 8]]) {
    const l = new THREE.PointLight(PALETTE.flame, 30, 18, 1.7);
    l.position.set(fx, 3.2, fz);
    scene.add(l);
    fireLights.push(l);
  }

  // ---- fire + smoke particle systems (pooled, allocation-free) ----
  const FIRE_N = 320;
  const firePos = new Float32Array(FIRE_N * 3);
  const fireCol = new Float32Array(FIRE_N * 3);
  const fireVel = new Float32Array(FIRE_N * 3);
  const fireTtl = new Float32Array(FIRE_N);
  const fireSrc = [[30, 8], [-30, 8], [27, -20]]; // two houses + furnace glow at site A
  for (let i = 0; i < FIRE_N; i += 1) { firePos[i * 3 + 1] = -999; fireTtl[i] = 0; }
  const fireGeo = new THREE.BufferGeometry();
  fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
  fireGeo.setAttribute('color', new THREE.BufferAttribute(fireCol, 3));
  const fireMat = new THREE.PointsMaterial({ size: 0.55, map: flameTex, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  const firePts = new THREE.Points(fireGeo, fireMat);
  firePts.frustumCulled = false;
  scene.add(firePts);
  let fireCursor = 0;
  function spawnFlame(x, y, z, spread, up, life, big) {
    const i = fireCursor;
    fireCursor = (fireCursor + 1) % FIRE_N;
    firePos[i * 3] = x + (rng() - 0.5) * spread;
    firePos[i * 3 + 1] = y;
    firePos[i * 3 + 2] = z + (rng() - 0.5) * spread;
    fireVel[i * 3] = (rng() - 0.5) * 0.8;
    fireVel[i * 3 + 1] = up * (0.7 + rng() * 0.7);
    fireVel[i * 3 + 2] = (rng() - 0.5) * 0.8;
    fireTtl[i] = life * (0.6 + rng() * 0.8);
    const hot = rng();
    const r = 1, g = hot > 0.5 ? 0.75 : 0.45, b = hot > 0.7 ? 0.25 : 0.06;
    fireCol[i * 3] = r * (big ? 1.4 : 1);
    fireCol[i * 3 + 1] = g;
    fireCol[i * 3 + 2] = b;
    fireGeo.attributes.color.needsUpdate = true;
  }
  // smoke columns: soft sprites that rise, grow and loop
  const smokeSprites = [];
  for (const [sx, sz] of [[30, 8], [-30, 8]]) {
    for (let i = 0; i < 6; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, opacity: 0.5, depthWrite: false });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat);
      m.position.set(sx + (rng() - 0.5) * 2, 4 + i * 2.2, sz + (rng() - 0.5) * 2);
      m.userData = { baseY: 4 + i * 2.2, phase: rng() * TAU, speed: 0.5 + rng() * 0.4 };
      scene.add(m);
      smokeSprites.push(m);
    }
  }

  // ---- sky dome (bright blue -> turquoise -> gold) + distant city ----
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4; skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  const grad = sctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, PALETTE.skyTop);
  grad.addColorStop(0.5, PALETTE.skyMid);
  grad.addColorStop(0.82, PALETTE.skyLow);
  grad.addColorStop(1, '#ffb85e');
  sctx.fillStyle = grad; sctx.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  // distant golden city: domes and minarets on the horizon
  const silMat = new THREE.MeshBasicMaterial({ color: 0xc98f4e, fog: false });
  const silWhite = new THREE.MeshBasicMaterial({ color: 0xf0dfb8, fog: false });
  const silhouettes = [
    [60, 10, -90, 24, 20, 8], [-70, 8, -80, 20, 16, 10], [95, 14, -40, 10, 28, 10],
    [-95, 10, 30, 28, 20, 8], [70, 7, 80, 22, 14, 8], [-60, 16, 90, 8, 32, 8],
  ];
  for (const [sx, sy, sz, sw, sh, sd] of silhouettes) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), silWhite);
    m.position.set(sx, sy, sz);
    scene.add(m);
    const d = new THREE.Mesh(new THREE.SphereGeometry(sw * 0.32, 12, 8, 0, TAU, 0, Math.PI / 2), silMat);
    d.position.set(sx, sy + sh / 2, sz);
    scene.add(d);
  }

  // ---- lights ----
  scene.add(new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, PALETTE.hemiIntensity));
  const sun = new THREE.DirectionalLight(PALETTE.sun, PALETTE.sunIntensity);
  sun.position.set(30, 42, 20);
  sun.target.position.set(0, 0, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.camera.far = 130;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  scene.fog = new THREE.Fog(PALETTE.fog, 55, 175);

  // ---- HELICOPTERS (2): low-poly, circling the arena ----
  function makeHeli(bodyColor, accentColor) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4, metalness: 0.4 });
    const accMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd4ff, roughness: 0.15, metalness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.6, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 3.2), bodyMat);
    body.position.y = 0;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 0.9), glassMat);
    nose.position.set(0, -0.05, -1.9);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4), accMat);
    tail.position.set(0, 0.15, 3.0);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.9), bodyMat);
    fin.position.set(0, 0.6, 4.5);
    const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.6), darkMat);
    skidL.position.set(-0.7, -0.75, -0.2);
    const skidR = skidL.clone();
    skidR.position.x = 0.7;
    const rotor = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(7.5, 0.08, 0.35);
    const blade1 = new THREE.Mesh(bladeGeo, darkMat);
    const blade2 = new THREE.Mesh(bladeGeo, darkMat);
    blade2.rotation.y = Math.PI / 2;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), darkMat);
    mast.position.y = 0.3;
    rotor.add(blade1, blade2, mast);
    rotor.position.y = 0.75;
    const tailRotor = new THREE.Group();
    const tr1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), darkMat);
    const tr2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), darkMat);
    tailRotor.add(tr1, tr2);
    tailRotor.position.set(0.35, 0.5, 4.6);
    g.add(body, nose, tail, fin, skidL, skidR, rotor, tailRotor);
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    scene.add(g);
    return { group: g, rotor, tailRotor };
  }
  const helis = [
    { ...makeHeli(0xd43a2a, 0xfff8ea), radius: 30, height: 26, speed: 0.11, phase: 0 },
    { ...makeHeli(0x18b8c8, 0xffc233), radius: 36, height: 31, speed: -0.085, phase: 2.4 },
  ];

  // ---- THE DRAGON: low-poly crimson dragon on a loop over the arena ----
  function makeDragon() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc22a1a, roughness: 0.7, metalness: 0.15 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xffc233, roughness: 0.7 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xff8a1e, roughness: 0.6, emissive: 0xff5a00, emissiveIntensity: 0.5, side: THREE.DoubleSide });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, roughness: 0.4 });
    // body: elongated sphere
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), bodyMat);
    body.scale.set(1, 0.9, 2.2);
    body.castShadow = true;
    g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), bellyMat);
    belly.scale.set(0.9, 0.7, 2.0);
    belly.position.set(0, -0.35, 0.1);
    g.add(belly);
    // neck: 3 tapering segments rising forward
    let nx = 0, ny = 0.6, nz = -2.2;
    const neckSegs = [];
    for (let i = 0; i < 3; i += 1) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.42 - i * 0.1, 0.5 - i * 0.1, 1.1, 8), bodyMat);
      seg.position.set(nx, ny + i * 0.75, nz - i * 0.45);
      seg.rotation.x = 0.5;
      seg.castShadow = true;
      g.add(seg);
      neckSegs.push(seg);
    }
    // head + snout + horns + jaw
    const head = new THREE.Group();
    head.position.set(0, 2.9, -3.6);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 1.0), bodyMat);
    skull.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.9), bodyMat);
    snout.position.set(0, -0.08, -0.85);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.8), bellyMat);
    jaw.position.set(0, -0.32, -0.8);
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 6), hornMat);
    hornL.position.set(-0.3, 0.55, 0.3);
    hornL.rotation.x = -0.5;
    const hornR = hornL.clone();
    hornR.position.x = 0.3;
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffe95e }));
    eyeL.position.set(-0.32, 0.12, -0.42);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.32;
    head.add(skull, snout, jaw, hornL, hornR, eyeL, eyeR);
    g.add(head);
    // wings: big flat triangles on pivots so they flap
    function wing(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.7, 0.5, 0.2);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(side * 3.4, 0.6);
      shape.lineTo(side * 2.6, -1.6);
      shape.lineTo(side * 1.2, -1.1);
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      const membrane = new THREE.Mesh(geo, wingMat);
      membrane.rotation.x = -Math.PI / 2;
      membrane.castShadow = true;
      const bone = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.12), bodyMat);
      bone.position.set(side * 1.6, 0, 0.3);
      bone.rotation.z = side * 0.18;
      pivot.add(membrane, bone);
      g.add(pivot);
      return pivot;
    }
    const wingL = wing(-1);
    const wingR = wing(1);
    // tail: 4 tapering segments + a spade tip
    let tx = 0, ty = 0.1, tz = 2.4;
    for (let i = 0; i < 4; i += 1) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.34 - i * 0.07, 0.42 - i * 0.07, 1.2, 8), bodyMat);
      seg.position.set(tx, ty - i * 0.12, tz + i * 1.0);
      seg.rotation.x = Math.PI / 2 - 0.12;
      seg.castShadow = true;
      g.add(seg);
    }
    const spade = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 4), bellyMat);
    spade.position.set(0, -0.45, 6.6);
    spade.rotation.x = Math.PI / 2;
    g.add(spade);
    // legs tucked under
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.5), bodyMat);
      leg.position.set(s * 0.6, -0.75, 0.6);
      g.add(leg);
    }
    scene.add(g);
    return { group: g, wingL, wingR, head };
  }
  const dragon = makeDragon();
  // dragon fire breath: a pooled cone of flame + a mouth light
  const BREATH_N = 160;
  const breathPos = new Float32Array(BREATH_N * 3);
  const breathCol = new Float32Array(BREATH_N * 3);
  const breathVel = new Float32Array(BREATH_N * 3);
  const breathTtl = new Float32Array(BREATH_N);
  for (let i = 0; i < BREATH_N; i += 1) { breathPos[i * 3 + 1] = -999; breathTtl[i] = 0; }
  const breathGeo = new THREE.BufferGeometry();
  breathGeo.setAttribute('position', new THREE.BufferAttribute(breathPos, 3));
  breathGeo.setAttribute('color', new THREE.BufferAttribute(breathCol, 3));
  const breathMat = new THREE.PointsMaterial({ size: 1.5, map: flameTex, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  const breathPts = new THREE.Points(breathGeo, breathMat);
  breathPts.frustumCulled = false;
  scene.add(breathPts);
  const breathLight = new THREE.PointLight(0xff7a1e, 0, 34, 1.6);
  scene.add(breathLight);
  let breathCursor = 0;
  let breathT = 0; // seconds into the breath cycle
  const BREATH_CYCLE = 9;
  const BREATH_LEN = 2.2;
  // the dragon flies a little bigger so it reads from the ground
  dragon.group.scale.setScalar(1.25);

  // ---- KARAGON, THE EMBER TITAN: a giant monster that stalks the arena ----
  // Original design (not a licensed character): an obsidian-scaled titan with
  // a crown of ember spikes down its back, glowing magma cracks in its chest
  // and a furnace glow in its throat. It patrols the courtyard on foot and
  // periodically breathes a cone of fire at the nearest fighter — its flame
  // is a REAL damage zone (combat.step hazards), so it forces repositioning.
  function makeKaiju() {
    const g = new THREE.Group();
    const hideMat = new THREE.MeshStandardMaterial({ color: 0x2e4034, roughness: 0.85, metalness: 0.1 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.9 });
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xff6a1e, roughness: 0.4, emissive: 0xff4400, emissiveIntensity: 1.4 });
    const crackMat = new THREE.MeshBasicMaterial({ color: 0xff7a1e });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd23e });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.5 });
    // legs on hip pivots so the walk cycle swings from the hip, not the middle
    function leg(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.75, 2.2, 0);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 2.2, 8), hideMat);
      shin.position.y = -1.1;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 1.7), hideMat);
      foot.position.set(0, -2.0, -0.25);
      pivot.add(shin, foot);
      g.add(pivot);
      return pivot;
    }
    const legL = leg(-1);
    const legR = leg(1);
    // torso (big, slightly tapered) + belly plate + magma cracks on the chest
    const torso = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.4, 2.2), hideMat);
    torso.position.set(0, 3.9, 0);
    torso.castShadow = true;
    const belly = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.5), bellyMat);
    belly.position.set(0, 3.7, -1.15);
    const cracks = [];
    for (let i = 0; i < 3; i += 1) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6 + i * 0.3, 0.06), crackMat);
      c.position.set(-0.6 + i * 0.6, 4.0, -1.42);
      c.rotation.z = (i - 1) * 0.25;
      cracks.push(c);
    }
    // shoulders + arms on shoulder pivots + clawed hands
    function arm(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.85, 5.2, 0);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 2.6, 8), hideMat);
      limb.position.y = -1.3;
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.9), hideMat);
      hand.position.set(0, -2.75, 0);
      pivot.add(limb, hand);
      g.add(pivot);
      return pivot;
    }
    const armL = arm(-1);
    const armR = arm(1);
    const claws = [];
    for (const hx of [-2.25, 2.25]) {
      for (let i = -1; i <= 1; i += 1) {
        const cl = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 5), hornMat);
        cl.position.set(hx + i * 0.22, 1.85, -0.5);
        cl.rotation.x = -1.2;
        claws.push(cl);
      }
    }
    // head + snout + jaw + glowing eyes + horns
    const head = new THREE.Group();
    head.position.set(0, 6.0, -0.2);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.5), hideMat);
    skull.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.9), hideMat);
    snout.position.set(0, -0.1, -1.1);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.85), bellyMat);
    jaw.position.set(0, -0.5, -1.05);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), eyeMat);
    eyeL.position.set(-0.38, 0.18, -0.72);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.38;
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), hornMat);
    hornL.position.set(-0.45, 0.7, 0.2);
    hornL.rotation.z = 0.35;
    const hornR = hornL.clone();
    hornR.position.x = 0.45;
    hornR.rotation.z = -0.35;
    head.add(skull, snout, jaw, eyeL, eyeR, hornL, hornR);
    // back spikes: a crown of ember spikes down the spine
    const spikes = [];
    for (let i = 0; i < 6; i += 1) {
      const h = 0.55 + Math.sin((i / 5) * Math.PI) * 0.5;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.3, h, 5), spikeMat);
      sp.position.set(0, 5.4 - i * 0.42, 1.05 + i * 0.06);
      sp.rotation.x = 0.55;
      spikes.push(sp);
    }
    // tail: 3 tapering segments + a spiked club tip, trailing behind (+Z)
    const tailSegs = [];
    for (let i = 0; i < 3; i += 1) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.5 - i * 0.12, 0.58 - i * 0.12, 1.4, 8), hideMat);
      seg.position.set(0, 2.2 - i * 0.35, 1.6 + i * 1.15);
      seg.rotation.x = Math.PI / 2 - 0.25;
      tailSegs.push(seg);
    }
    const club = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 6), spikeMat);
    club.position.set(0, 1.0, 5.2);
    club.rotation.x = Math.PI / 2;
    // furnace glow inside the throat (flares while breathing)
    const throat = new THREE.PointLight(0xff5a00, 0, 14, 1.8);
    throat.position.set(0, 5.6, -1.6);
    g.add(torso, belly, ...cracks, head, ...spikes, ...tailSegs, club, throat);
    // claws are placed in world-ish local coords; attach them to the group
    for (const cl of claws) g.add(cl);
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    scene.add(g);
    return { group: g, head, jaw, legL, legR, armL, armR, throat };
  }
  const kaiju = makeKaiju();
  // kaiju patrol + breath state
  let kaijuAngle = 0.6; // angle on the courtyard loop
  const KAIJU_CENTER = { x: 0, z: 6 };
  const KAIJU_RADIUS = 7;
  let kaijuBreathCd = 6; // seconds until the next breath
  let kaijuBreathT = 0; // seconds into the current breath (0 = not breathing)
  const KAIJU_BREATH_LEN = 2.6;
  const KAIJU_BREATH_RANGE = 20; // only breathes when a fighter is this close
  const kaijuBreath = { active: false, mx: 0, my: 0, mz: 0, dx: 0, dy: 0, dz: 0 };
  let kaijuTarget = null; // agent the kaiju is currently breathing at
  const kaijuLight = new THREE.PointLight(0xff6a1e, 0, 26, 1.6);
  scene.add(kaijuLight);
  // dragon ground fire: where the dragon's breath lands and sets the ground ablaze
  const dragonGroundFire = { active: false, x: 0, z: 0, r: 4.2 };
  const dragonGroundTarget = { x: 0, z: 0 };
  let dragonFireLinger = 0;

  // ---- site floor markings (turquoise borders, no colliders) ----
  function stripe(x, z, w, d) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.turquoise);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.02, z);
    m.receiveShadow = true;
    group.add(m);
  }
  stripe(25, -9.2, 16, 0.5);
  stripe(25, -22.8, 16, 0.5);
  stripe(-25, -9.2, 16, 0.5);
  stripe(-25, -22.8, 16, 0.5);
  function letterA(cx, cz) {
    box(0.5, 0.06, 3, cx - 0.9, 0.03, cz, 'gold', false);
    box(0.5, 0.06, 3, cx + 0.9, 0.03, cz, 'gold', false);
    box(2.3, 0.06, 0.5, cx, 0.03, cz - 1.2, 'gold', false);
    box(1.4, 0.06, 0.5, cx, 0.03, cz, 'gold', false);
  }
  function letterB(cx, cz) {
    box(0.5, 0.06, 3, cx - 0.9, 0.03, cz, 'gold', false);
    box(1.4, 0.06, 0.5, cx - 0.2, 0.03, cz - 1.25, 'gold', false);
    box(1.4, 0.06, 0.5, cx - 0.2, 0.03, cz, 'gold', false);
    box(1.4, 0.06, 0.5, cx - 0.2, 0.03, cz + 1.25, 'gold', false);
    box(0.5, 0.06, 1.2, cx + 0.6, 0.03, cz - 0.65, 'gold', false);
    box(0.5, 0.06, 1.2, cx + 0.6, 0.03, cz + 0.65, 'gold', false);
  }
  letterA(25, -16);
  letterB(-25, -16);

  // ---- waypoints: hand-placed graph bots route on ----
  const nodes = [
    { x: 0, z: 21 }, { x: -8, z: 18 }, { x: 8, z: 18 }, { x: 0, z: 12 },
    { x: -8, z: 10 }, { x: 8, z: 10 }, { x: 0, z: 4 }, { x: -8, z: -2 },
    { x: 8, z: -2 }, { x: 0, z: -6 }, { x: 26, z: 12 }, { x: 27, z: 4 },
    { x: 27, z: -4 }, { x: 26, z: -10 }, { x: -26, z: 12 }, { x: -27, z: 4 },
    { x: -27, z: -4 }, { x: -26, z: -10 }, { x: 20, z: -12 }, { x: 27, z: -14 },
    { x: 31, z: -19 }, { x: 22, z: -20 }, { x: -20, z: -12 }, { x: -27, z: -14 },
    { x: -31, z: -19 }, { x: -22, z: -20 }, { x: 0, z: -21 }, { x: -8, z: -18 },
    { x: 8, z: -18 }, { x: -12, z: -12 }, { x: 12, z: -12 }, { x: -13, z: 0 },
    { x: 13, z: 0 },
  ];
  const links = [
    [0, 1], [0, 2], [0, 3], [1, 4], [2, 5], [3, 4], [3, 5], [3, 6],
    [4, 7], [5, 8], [6, 7], [6, 8], [6, 9], [7, 9], [8, 9], [7, 31], [8, 32],
    [4, 14], [5, 10], [10, 11], [11, 12], [12, 13], [13, 19], [13, 18],
    [14, 15], [15, 16], [16, 17], [17, 23], [17, 22], [18, 19], [19, 20],
    [19, 21], [22, 23], [23, 24], [23, 25], [26, 27], [26, 28], [26, 9],
    [27, 29], [28, 30], [29, 7], [30, 8], [29, 22], [30, 18], [29, 31], [30, 32],
    [31, 15], [32, 11], [31, 7], [32, 8],
  ];
  for (const [a, b] of links) {
    nodes[a].links = nodes[a].links || [];
    nodes[b].links = nodes[b].links || [];
    nodes[a].links.push(b);
    nodes[b].links.push(a);
  }

  const sites = {
    A: { minX: 17, maxX: 33, minZ: -23, maxZ: -9, plant: { x: 26, z: -16 } },
    B: { minX: -33, maxX: -17, minZ: -23, maxZ: -9, plant: { x: -26, z: -16 } },
  };
  const spawns = {
    dragons: [[0, 21], [-4, 22], [4, 22], [-8, 19], [8, 19]],
    djinn: [[0, -21], [-4, -22], [4, -22], [-8, -19], [8, -19]],
  };

  let flicker = 0;
  let rotorSnd = 0;
  return {
    colliders,
    nodes,
    sites,
    spawns,
    dragon,
    helis,
    kaiju,
    kaijuBreath,
    dragonGroundFire,
    // push a position out of KARAGON's body so nobody walks through the titan
    pushOutKaiju(pos) {
      const dx = pos.x - kaiju.group.position.x;
      const dz = pos.z - kaiju.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 2.4 && d > 0.0001) {
        pos.x = kaiju.group.position.x + (dx / d) * 2.4;
        pos.z = kaiju.group.position.z + (dz / d) * 2.4;
      }
    },
    spawnFlame,
    // expose the dragon's current mouth world position for staging screenshots
    dragonMouth(out) {
      dragon.group.updateMatrixWorld();
      out.set(0, 2.9, -3.6);
      return dragon.group.localToWorld(out);
    },
    setDragonBreath(t) { breathT = t; },
    // force KARAGON into a breath right now (staging screenshots / debugging)
    setKaijuBreath() { kaijuBreathCd = 0; },
    // place KARAGON at a courtyard spot (staging screenshots); the patrol
    // continues from this angle afterwards
    setKaijuPos(x, z) {
      kaijuAngle = Math.atan2((z - KAIJU_CENTER.z) / 0.85, x - KAIJU_CENTER.x);
      kaiju.group.position.set(x, 0, z);
    },
    update(dt, time, S) {
      flicker += dt;
      const f = 0.85 + Math.sin(flicker * 9.1) * 0.08 + Math.sin(flicker * 23.7) * 0.07;
      for (const l of fireLights) l.intensity = 30 * f;
      mats.emberGlow.emissiveIntensity = 2.4 * f;

      // burning buildings: steady flame spawns + rising smoke
      for (const [fx, fz] of fireSrc) {
        spawnFlame(fx, 1.2, fz, 3.4, 3.4, 1.1, false);
        spawnFlame(fx, 2.0, fz, 2.4, 3.0, 0.9, false);
        if (rng() < 0.35) spawnFlame(fx, 0.6, fz, 4.2, 5.2, 1.4, true); // embers
      }
      for (let i = 0; i < FIRE_N; i += 1) {
        if (fireTtl[i] <= 0) continue;
        fireTtl[i] -= dt;
        if (fireTtl[i] <= 0) { firePos[i * 3 + 1] = -999; continue; }
        fireVel[i * 3 + 1] -= 1.2 * dt;
        firePos[i * 3] += fireVel[i * 3] * dt;
        firePos[i * 3 + 1] += fireVel[i * 3 + 1] * dt;
        firePos[i * 3 + 2] += fireVel[i * 3 + 2] * dt;
        const k = Math.max(0.15, fireTtl[i]);
        fireCol[i * 3] = Math.min(1.4, k * 1.1);
        fireCol[i * 3 + 1] = Math.max(0.05, k * 0.55);
        fireCol[i * 3 + 2] = 0.05;
      }
      fireGeo.attributes.position.needsUpdate = true;
      fireGeo.attributes.color.needsUpdate = true;
      for (const m of smokeSprites) {
        m.userData.phase += dt * m.userData.speed;
        const cyc = (m.userData.phase % TAU) / TAU;
        m.position.y = m.userData.baseY + cyc * 9;
        const s = 3.5 + cyc * 4.5;
        m.scale.set(s, s, 1);
        m.material.opacity = 0.55 * (1 - cyc);
        m.lookAt(m.position.x, m.position.y, m.position.z + 1);
        m.rotation.z = m.userData.phase * 0.4;
      }

      // helicopters: slow circles, spinning rotors, gentle bob
      for (const h of helis) {
        const a = time * h.speed + h.phase;
        const x = Math.cos(a) * h.radius;
        const z = Math.sin(a) * h.radius * 0.75;
        h.group.position.set(x, h.height + Math.sin(time * 0.7 + h.phase) * 1.2, z);
        h.group.rotation.y = -a + (h.speed > 0 ? 0 : Math.PI);
        h.group.rotation.z = h.speed > 0 ? 0.18 : -0.18;
        h.rotor.rotation.y += dt * 26;
        h.tailRotor.rotation.x += dt * 30;
      }
      rotorSnd -= dt;
      if (rotorSnd <= 0) {
        rotorSnd = 0.55;
        if (S) S.events.push({ type: 'rotor' });
      }

      // dragon: big ellipse loop, banking, flapping wings
      breathT += dt;
      const dA = time * 0.085 + 0.6;
      const dx = Math.cos(dA) * 30;
      const dz = Math.sin(dA) * 21;
      const dy = 20 + Math.sin(time * 0.35) * 2.5;
      dragon.group.position.set(dx, dy, dz);
      dragon.group.rotation.y = -dA + (Math.PI / 2);
      dragon.group.rotation.z = 0.22;
      const flap = Math.sin(time * 3.1) * 0.55;
      dragon.wingL.rotation.z = 0.35 + flap;
      dragon.wingR.rotation.z = -0.35 - flap;
      dragon.head.rotation.y = Math.sin(time * 0.8) * 0.2;
      // fire breath: 2.2 s of flame every 9 s, aimed at the ground under the
      // nearest fighter — the dragon's fire lands and sets the ground ablaze,
      // so it is a real hazard (combat.step hazards), not just a sky show.
      // The ground target is fixed when the roar sounds, so a fighter who
      // moves on the roar dodges the landing; the flame takes ~0.5 s to arrive.
      const breathPhase = breathT % BREATH_CYCLE;
      const inBreath = breathPhase < BREATH_LEN;
      if (inBreath) {
        if (breathPhase < dt) {
          if (S) S.events.push({ type: 'roar' });
          // pick the ground target: nearest living fighter to the dragon
          let best = null, bestD = 1e9;
          if (S && S.agents) {
            for (const a of S.agents) {
              if (!a.alive) continue;
              const d = Math.hypot(a.body.pos.x - dragon.group.position.x, a.body.pos.z - dragon.group.position.z);
              if (d < bestD) { bestD = d; best = a; }
            }
          }
          if (best) { dragonGroundTarget.x = best.body.pos.x; dragonGroundTarget.z = best.body.pos.z; }
          else { dragonGroundTarget.x = (rng() - 0.5) * 30; dragonGroundTarget.z = (rng() - 0.5) * 30; }
        }
        // mouth world position + direction to the ground target
        const mouth = dragon.group.localToWorld(new THREE.Vector3(0, 2.9, -4.2));
        const dx = dragonGroundTarget.x - mouth.x;
        const dy = 0 - mouth.y;
        const dz = dragonGroundTarget.z - mouth.z;
        const dlen = Math.hypot(dx, dy, dz) || 1;
        const dirx = dx / dlen, diry = dy / dlen, dirz = dz / dlen;
        breathLight.position.copy(mouth);
        breathLight.intensity = 90;
        for (let k = 0; k < 6; k += 1) {
          const i = breathCursor;
          breathCursor = (breathCursor + 1) % BREATH_N;
          breathPos[i * 3] = mouth.x + (rng() - 0.5) * 0.6;
          breathPos[i * 3 + 1] = mouth.y + (rng() - 0.5) * 0.6;
          breathPos[i * 3 + 2] = mouth.z + (rng() - 0.5) * 0.6;
          const sp = 22 + rng() * 8;
          breathVel[i * 3] = dirx * sp + (rng() - 0.5) * 5;
          breathVel[i * 3 + 1] = diry * sp + (rng() - 0.5) * 3;
          breathVel[i * 3 + 2] = dirz * sp + (rng() - 0.5) * 5;
          breathTtl[i] = 0.8 + rng() * 0.5;
          breathCol[i * 3] = 1.6;
          breathCol[i * 3 + 1] = 0.5;
          breathCol[i * 3 + 2] = 0.05;
        }
        breathGeo.attributes.color.needsUpdate = true;
        // the ground where the breath lands catches fire (after the flame arrives)
        if (breathPhase > 0.5) {
          dragonGroundFire.active = true;
          dragonGroundFire.x = dragonGroundTarget.x;
          dragonGroundFire.z = dragonGroundTarget.z;
          dragonFireLinger = 2.0;
          spawnFlame(dragonGroundTarget.x, 0.8, dragonGroundTarget.z, 3.6, 3.4, 1.0, false);
          spawnFlame(dragonGroundTarget.x, 1.6, dragonGroundTarget.z, 2.6, 3.0, 0.9, false);
        }
      } else {
        breathLight.intensity = 0;
        if (dragonFireLinger > 0) {
          dragonFireLinger -= dt;
          dragonGroundFire.active = true;
          spawnFlame(dragonGroundFire.x, 0.8, dragonGroundFire.z, 3.6, 3.4, 1.0, false);
          if (dragonFireLinger <= 0) dragonGroundFire.active = false;
        } else {
          dragonGroundFire.active = false;
        }
      }
      for (let i = 0; i < BREATH_N; i += 1) {
        if (breathTtl[i] <= 0) continue;
        breathTtl[i] -= dt;
        if (breathTtl[i] <= 0) { breathPos[i * 3 + 1] = -999; continue; }
        breathVel[i * 3 + 1] -= 4 * dt;
        breathPos[i * 3] += breathVel[i * 3] * dt;
        breathPos[i * 3 + 1] += breathVel[i * 3 + 1] * dt;
        breathPos[i * 3 + 2] += breathVel[i * 3 + 2] * dt;
        const k = Math.max(0.1, breathTtl[i] * 1.6);
        breathCol[i * 3] = Math.min(1.6, k);
        breathCol[i * 3 + 1] = Math.max(0.05, k * 0.32);
        breathCol[i * 3 + 2] = 0.05;
      }
      breathGeo.attributes.position.needsUpdate = true;
      breathGeo.attributes.color.needsUpdate = true;

      // KARAGON: slow courtyard patrol, then a fire breath at the nearest fighter
      kaijuBreathCd -= dt;
      if (kaijuBreathT <= 0) {
        // walk the courtyard loop
        kaijuAngle += dt * 0.055;
        const kx = KAIJU_CENTER.x + Math.cos(kaijuAngle) * KAIJU_RADIUS;
        const kz = KAIJU_CENTER.z + Math.sin(kaijuAngle) * KAIJU_RADIUS * 0.85;
        const nx = KAIJU_CENTER.x + Math.cos(kaijuAngle + 0.08) * KAIJU_RADIUS;
        const nz = KAIJU_CENTER.z + Math.sin(kaijuAngle + 0.08) * KAIJU_RADIUS * 0.85;
        kaiju.group.position.set(kx, 0, kz);
        kaiju.group.rotation.y = Math.atan2(-(nx - kx), -(nz - kz));
        // walk cycle: leg swing from the hips + body bob + arm sway
        const w = time * 2.4;
        kaiju.legL.rotation.x = Math.sin(w) * 0.45;
        kaiju.legR.rotation.x = -Math.sin(w) * 0.45;
        kaiju.armL.rotation.x = -Math.sin(w) * 0.25;
        kaiju.armR.rotation.x = Math.sin(w) * 0.25;
        kaiju.group.position.y = Math.abs(Math.sin(w)) * 0.12;
        kaiju.jaw.rotation.x = 0;
        kaiju.throat.intensity = 0;
        kaijuLight.intensity = 0;
        // pick a breath target when the cooldown ends
        if (kaijuBreathCd <= 0 && S && S.agents) {
          let best = null, bestD = KAIJU_BREATH_RANGE;
          for (const a of S.agents) {
            if (!a.alive) continue;
            const d = Math.hypot(a.body.pos.x - kx, a.body.pos.z - kz);
            if (d < bestD) { bestD = d; best = a; }
          }
          if (best) {
            kaijuTarget = best;
            kaijuBreathT = KAIJU_BREATH_LEN;
            if (S) S.events.push({ type: 'kaijuRoar' });
          } else {
            kaijuBreathCd = 3; // nobody near — try again soon
          }
        }
      } else {
        kaijuBreathT -= dt;
        // face the target (limited turn rate, so a fast fighter can dodge out
        // of the cone) and breathe a cone of fire at them
        const tp = kaijuTarget && kaijuTarget.alive ? kaijuTarget.body.pos : null;
        const mouth = kaiju.group.localToWorld(new THREE.Vector3(0, 5.9, -1.3));
        let dirx, diry, dirz;
        if (tp) {
          const want = Math.atan2(-(tp.x - kaiju.group.position.x), -(tp.z - kaiju.group.position.z));
          let diff = want - kaiju.group.rotation.y;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          kaiju.group.rotation.y += Math.max(-0.9 * dt, Math.min(0.9 * dt, diff));
          const dx = tp.x - mouth.x, dy = (tp.y + 1.0) - mouth.y, dz = tp.z - mouth.z;
          const len = Math.hypot(dx, dy, dz) || 1;
          dirx = dx / len; diry = dy / len; dirz = dz / len;
        } else {
          dirx = -Math.sin(kaiju.group.rotation.y); diry = -0.15; dirz = -Math.cos(kaiju.group.rotation.y);
          const len = Math.hypot(dirx, diry, dirz) || 1;
          dirx /= len; diry /= len; dirz /= len;
        }
        kaiju.jaw.rotation.x = 0.5; // jaw opens while breathing
        kaiju.throat.intensity = 14;
        kaijuLight.position.copy(mouth);
        kaijuLight.intensity = 90;
        // flame cone: a stream of flames along the breath direction
        for (let k = 0; k < 9; k += 1) {
          const dist = 2 + (k / 9) * 13;
          const spread = 0.8 + dist * 0.22;
          spawnFlame(
            mouth.x + dirx * dist, mouth.y + diry * dist, mouth.z + dirz * dist,
            spread, 1.2, 1.0, k < 2,
          );
        }
        kaijuBreath.active = true;
        kaijuBreath.mx = mouth.x; kaijuBreath.my = mouth.y; kaijuBreath.mz = mouth.z;
        kaijuBreath.dx = dirx; kaijuBreath.dy = diry; kaijuBreath.dz = dirz;
        if (kaijuBreathT <= 0) {
          kaijuBreathT = 0;
          kaijuBreath.active = false;
          kaijuBreathCd = 8 + rng() * 3;
          kaijuTarget = null;
          kaiju.jaw.rotation.x = 0;
          kaiju.throat.intensity = 0;
          kaijuLight.intensity = 0;
        }
      }
    },
  };
}
