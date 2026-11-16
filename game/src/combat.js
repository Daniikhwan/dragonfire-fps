// DRAGONFIRE — combat: hitscan resolution, LASER beams, particles, grenades
// and the bomb. Bullets are analytic rays against agent hit spheres and world
// AABBs — no raycaster allocations in the hot path. Effects are pooled.
//
// LASER SIGNATURE (the gunplay's visual identity): every shot draws a THICK
// two-layer beam — a bright white-hot core plus a wide coloured glow halo —
// built from additive beam meshes, never a 1px line (invisible at 720p).
// A glowing muzzle flash and a bright impact flare + sparks mark each hit.
import * as THREE from 'three';
import { PALETTE, TUNING } from './palette.js';
import { raySphere, rayAABB, segmentBlocked, clamp, V1 } from './utils.js';

function radialTexture(inner, mid, outer) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createCombat(scene, world, S, audio) {
  const colliders = world.colliders;
  const glowTex = radialTexture('rgba(255,255,255,1)', 'rgba(160,235,255,0.7)', 'rgba(40,140,255,0)');
  const smokeTex = radialTexture('rgba(210,205,195,0.85)', 'rgba(170,164,154,0.5)', 'rgba(150,144,134,0)');

  // ---- LASER BEAMS: pooled dual-mesh shots (core + halo) ----
  // Core: thick white-hot bar. Halo: a wider coloured glow around the same
  // axis. Together they read as a solid laser even at 1280x720 and in a still
  // screenshot, where a 1px line would vanish entirely.
  const LASERS = 24;
  const lasers = [];
  for (let i = 0; i < LASERS; i += 1) {
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1), coreMat);
    core.visible = false;
    core.frustumCulled = false;
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x66e8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const halo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1), haloMat);
    halo.visible = false;
    halo.frustumCulled = false;
    scene.add(core, halo);
    lasers.push({ core, halo, ttl: 0 });
  }
  let laserCursor = 0;
  function spawnLaser(from, to, color) {
    const l = lasers[laserCursor];
    laserCursor = (laserCursor + 1) % LASERS;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz) || 0.001;
    const ux = dx / len, uy = dy / len, uz = dz / len;
    // Start the beam 2 m out from the muzzle: a beam that begins at the camera
    // lens reads as a huge white trapezoid in first person (perspective).
    // 2 m out it reads as a clean thick line from the crosshair to the target.
    const sx = from.x + ux * 2.0, sy = from.y + uy * 2.0, sz = from.z + uz * 2.0;
    const beamLen = Math.max(0.1, len - 2.0);
    const mx = (sx + to.x) / 2, my = (sy + to.y) / 2, mz = (sz + to.z) / 2;
    for (const mesh of [l.core, l.halo]) {
      mesh.position.set(mx, my, mz);
      mesh.scale.set(1, 1, beamLen);
      mesh.lookAt(to.x, to.y, to.z);
      mesh.visible = true;
    }
    l.core.material.color.setHex(0xffffff);
    l.core.material.opacity = 1;
    l.halo.material.color.setHex(color);
    l.halo.material.opacity = 0.75;
    l.ttl = 0.12;
  }

  // ---- impact flares: bright glowing sprites at the hit point ----
  const FLARES = 16;
  const flares = [];
  for (let i = 0; i < FLARES; i += 1) {
    const mat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.65), mat);
    m.visible = false;
    m.frustumCulled = false;
    scene.add(m);
    flares.push({ mesh: m, ttl: 0 });
  }
  let flareCursor = 0;
  function spawnFlare(x, y, z, color, size) {
    const f = flares[flareCursor];
    flareCursor = (flareCursor + 1) % FLARES;
    f.mesh.position.set(x, y, z);
    f.mesh.scale.set(size, size, 1);
    f.mesh.material.color.setHex(color);
    f.mesh.material.opacity = 0.7;
    f.mesh.visible = true;
    f.ttl = 0.16;
  }
  // two pooled impact lights so hits light up the wall/agent they strike
  const impactLights = [];
  for (let i = 0; i < 2; i += 1) {
    const l = new THREE.PointLight(0x66e8ff, 0, 9, 1.8);
    scene.add(l);
    impactLights.push(l);
  }
  let impactCursor = 0;
  function flashImpact(x, y, z, color) {
    const l = impactLights[impactCursor];
    impactCursor = (impactCursor + 1) % impactLights.length;
    l.position.set(x, y, z);
    l.color.setHex(color);
    l.intensity = 14;
  }

  // ---- pooled spark points (vertex-coloured) ----
  const SPARKS = 240;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkCol = new Float32Array(SPARKS * 3);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkTtl = new Float32Array(SPARKS);
  for (let i = 0; i < SPARKS; i += 1) sparkPos[i * 3 + 1] = -999;
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  const sparkMat = new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);
  let sparkCursor = 0;
  function spawnSparks(x, y, z, n, color, speed) {
    for (let k = 0; k < n; k += 1) {
      const i = sparkCursor;
      sparkCursor = (sparkCursor + 1) % SPARKS;
      sparkPos[i * 3] = x; sparkPos[i * 3 + 1] = y; sparkPos[i * 3 + 2] = z;
      const a = S.rng() * Math.PI * 2, e = (S.rng() - 0.3) * Math.PI;
      const s = speed * (0.4 + S.rng() * 0.8);
      sparkVel[i * 3] = Math.cos(a) * Math.cos(e) * s;
      sparkVel[i * 3 + 1] = Math.sin(e) * s + speed * 0.4;
      sparkVel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * s;
      sparkCol[i * 3] = ((color >> 16) & 255) / 255;
      sparkCol[i * 3 + 1] = ((color >> 8) & 255) / 255;
      sparkCol[i * 3 + 2] = (color & 255) / 255;
      sparkTtl[i] = 0.25 + S.rng() * 0.35;
    }
    sparkGeo.attributes.color.needsUpdate = true;
  }

  // ---- explosion flash light (single pooled light) ----
  const boomLight = new THREE.PointLight(0xff9a30, 0, 26, 1.6);
  scene.add(boomLight);

  // ---- grenade projectiles ----
  const grenades = [];
  const grenadeMeshes = [];
  for (let i = 0; i < 8; i += 1) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.6, metalness: 0.4, emissive: 0x18e8c8, emissiveIntensity: 0.8 }),
    );
    m.visible = false;
    scene.add(m);
    grenadeMeshes.push(m);
    grenades.push({ active: false, mesh: m, pos: new THREE.Vector3(), vel: new THREE.Vector3(), kind: 'he', fuse: 0, bounced: false });
  }

  // ---- smoke clouds (visual sprites + LOS blockers) ----
  const smokeGroups = new Map();
  function addSmokeVisual(smoke) {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, opacity: 0.55, depthWrite: false });
      const p = new THREE.PlaneGeometry(3.4, 3.4);
      const m = new THREE.Mesh(p, mat);
      const a = S.rng() * Math.PI * 2, r = S.rng() * 2.2;
      m.position.set(smoke.x + Math.cos(a) * r, smoke.y + 0.6 + S.rng() * 1.6, smoke.z + Math.sin(a) * r);
      m.rotation.y = S.rng() * Math.PI;
      g.add(m);
    }
    scene.add(g);
    smokeGroups.set(smoke, g);
  }
  function removeSmokeVisual(smoke) {
    const g = smokeGroups.get(smoke);
    if (!g) return;
    scene.remove(g);
    g.children.forEach((m) => { m.material.dispose(); m.geometry.dispose(); });
    smokeGroups.delete(smoke);
  }

  function agentSpheres(agent) {
    const b = agent.body;
    const h = b.height;
    return [
      { x: b.pos.x, y: b.pos.y + h - 0.16, z: b.pos.z, r: 0.24, part: 'head' },
      { x: b.pos.x, y: b.pos.y + h * 0.58, z: b.pos.z, r: 0.38, part: 'body' },
      { x: b.pos.x, y: b.pos.y + h * 0.26, z: b.pos.z, r: 0.3, part: 'body' },
    ];
  }

  function damageAgent(victim, amount, attacker, head) {
    if (!victim.alive) return;
    victim.hp -= amount;
    victim.lastDamageT = S.time;
    if (attacker && attacker.isPlayer) {
      S.events.push({ type: 'hitmark', head });
      audio.hit(head);
    }
    if (victim.isPlayer) {
      S.events.push({ type: 'damage', fromX: attacker ? attacker.body.pos.x : 0, fromZ: attacker ? attacker.body.pos.z : 0 });
      audio.hurt();
    }
    if (victim.hp <= 0) {
      victim.hp = 0;
      victim.alive = false;
      victim.fallT = 0;
      const killerName = attacker ? attacker.name : 'world';
      S.feed.push({ text: `${killerName}  ▸  ${victim.name}${head ? '  ◉' : ''}`, team: attacker ? attacker.team : 'dragons', t: S.time });
      if (S.feed.length > 6) S.feed.shift();
      if (attacker && attacker.isPlayer) {
        S.money = Math.min(TUNING.maxMoney, S.money + TUNING.killMoney);
        S.kills += 1;
        audio.kill();
      }
      if (victim.isPlayer) S.deaths += 1;
      if (S.bomb.carrier === victim) {
        S.bomb.carrier = null;
        S.bomb.state = 'dropped';
        S.bomb.x = victim.body.pos.x;
        S.bomb.z = victim.body.pos.z;
      }
      S.events.push({ type: 'death', victim, attacker });
    }
  }

  // One trigger pull. Returns {hit:boolean, head:boolean, killed:boolean}.
  function shoot(shooter, dirX, dirY, dirZ, spread) {
    const w = shooter.weapon;
    const def = w.def;
    const b = shooter.body;
    const muzzle = V1.set(b.pos.x, b.pos.y + b.eye - 0.12, b.pos.z);
    S.lastShot = { x: muzzle.x, y: muzzle.y, z: muzzle.z, t: S.time, team: shooter.team };
    const beamColor = shooter.team === 'dragons' ? PALETTE.tracerDragons : PALETTE.tracerDjinn;
    let anyHit = false, anyHead = false, anyKill = false;
    for (let p = 0; p < def.pellets; p += 1) {
      const dx = dirX + (S.rng() * 2 - 1) * spread;
      const dy = dirY + (S.rng() * 2 - 1) * spread;
      const dz = dirZ + (S.rng() * 2 - 1) * spread;
      const len = Math.hypot(dx, dy, dz) || 1;
      const nx = dx / len, ny = dy / len, nz = dz / len;
      let bestT = def.range;
      let bestAgent = null, bestPart = null;
      for (let i = 0; i < S.agents.length; i += 1) {
        const target = S.agents[i];
        if (target === shooter || !target.alive) continue;
        const spheres = agentSpheres(target);
        for (let s = 0; s < spheres.length; s += 1) {
          const sp = spheres[s];
          const t = raySphere(muzzle.x, muzzle.y, muzzle.z, nx, ny, nz, sp.x, sp.y, sp.z, sp.r);
          if (t >= 0 && t < bestT) { bestT = t; bestAgent = target; bestPart = sp.part; }
        }
      }
      let wallT = -1;
      for (let i = 0; i < colliders.length; i += 1) {
        const t = rayAABB(muzzle.x, muzzle.y, muzzle.z, nx, ny, nz, colliders[i], bestT);
        if (t >= 0 && t < bestT) { wallT = t; }
      }
      const endX = muzzle.x + nx * bestT, endY = muzzle.y + ny * bestT, endZ = muzzle.z + nz * bestT;
      // THICK LASER: core + halo from the muzzle to the impact point.
      spawnLaser(muzzle, { x: endX, y: endY, z: endZ }, beamColor);
      if (bestAgent && (wallT < 0 || bestT <= wallT)) {
        const head = bestPart === 'head';
        const dist = bestT;
        const falloff = dist < def.range * 0.4 ? 1 : 1 - (dist - def.range * 0.4) / (def.range * 0.6) * 0.45;
        const dmg = Math.round(def.damage * (head ? def.headMul : 1) * falloff);
        const wasAlive = bestAgent.alive;
        damageAgent(bestAgent, dmg, shooter, head);
        anyHit = true; anyHead = anyHead || head;
        if (wasAlive && !bestAgent.alive) anyKill = true;
        // impact flare + glow + sparks on the body hit
        spawnFlare(endX, endY, endZ, head ? 0xffd23a : beamColor, head ? 1.3 : 1.0);
        flashImpact(endX, endY, endZ, beamColor);
        spawnSparks(endX, endY, endZ, 6, head ? 0xffd23a : 0x66e8ff, 3.2);
      } else if (wallT >= 0) {
        spawnFlare(endX, endY, endZ, beamColor, 0.9);
        flashImpact(endX, endY, endZ, beamColor);
        spawnSparks(endX, endY, endZ, 8, 0xffc860, 3.6);
      }
    }
    return { hit: anyHit, head: anyHead, killed: anyKill };
  }

  function throwGrenade(agent, kind) {
    const g = grenades.find((x) => !x.active);
    if (!g) return;
    const b = agent.body;
    g.active = true;
    g.kind = kind;
    g.fuse = kind === 'smoke' ? 1.1 : 2.0;
    g.bounced = false;
    g.pos.set(b.pos.x, b.pos.y + b.eye - 0.1, b.pos.z);
    const fwd = V1.set(-Math.sin(b.yaw), 0, -Math.cos(b.yaw));
    g.vel.set(fwd.x * 13, 5.2 + b.pitch * -4, fwd.z * 13);
    g.mesh.visible = true;
    g.mesh.position.copy(g.pos);
    audio.grenadeThrow();
  }

  function explode(x, y, z) {
    boomLight.position.set(x, y + 1, z);
    boomLight.intensity = 260;
    spawnSparks(x, y + 0.5, z, 60, 0xffa030, 9);
    spawnSparks(x, y + 0.5, z, 30, 0x5a5a5a, 4);
    audio.explosion();
    for (let i = 0; i < S.agents.length; i += 1) {
      const a = S.agents[i];
      if (!a.alive) continue;
      const dx = a.body.pos.x - x, dy = (a.body.pos.y + 1) - y, dz = a.body.pos.z - z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 7) continue;
      const blocked = segmentBlocked(x, y + 0.5, z, a.body.pos.x, a.body.pos.y + 1, a.body.pos.z, colliders, null);
      let dmg = Math.round((100 - dist * 12) * (blocked ? 0.25 : 1));
      if (dmg > 0) damageAgent(a, dmg, null, false);
    }
    S.events.push({ type: 'explosion', x, y, z });
  }

  function inSite(site, x, z) {
    const s = world.sites[site];
    return x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ;
  }

  // ---- dynamic hazards: KARAGON's fire breath + the dragon's ground fire ----
  // Both are REAL damage zones, not decoration: standing in the flame burns.
  // The kaiju breath is a cone from its mouth (dodgeable by strafing out of
  // it — the titan turns slowly); the dragon's fire is a burning patch on the
  // ground where its breath landed (move off it). Either can finish a low-hp
  // fighter, and being burned interrupts a plant/defuse (lastDamageT).
  function hazards(dt) {
    if (S.phase !== 'live') return;
    const kb = world.kaijuBreath;
    if (kb && kb.active) {
      const cosHalf = Math.cos(0.42);
      for (let i = 0; i < S.agents.length; i += 1) {
        const a = S.agents[i];
        if (!a.alive) continue;
        const cx = a.body.pos.x, cy = a.body.pos.y + 1.0, cz = a.body.pos.z;
        const vx = cx - kb.mx, vy = cy - kb.my, vz = cz - kb.mz;
        const dist = Math.hypot(vx, vy, vz);
        if (dist > 17 || dist < 0.5) continue;
        const dot = (vx * kb.dx + vy * kb.dy + vz * kb.dz) / dist;
        if (dot > cosHalf) {
          damageAgent(a, 30 * dt, null, false);
          if (a.isPlayer) S.events.push({ type: 'burn' });
          if (S.rng() < 0.5) world.spawnFlame(cx, cy, cz, 0.6, 2.5, 0.6, false);
        }
      }
    }
    const gf = world.dragonGroundFire;
    if (gf && gf.active) {
      for (let i = 0; i < S.agents.length; i += 1) {
        const a = S.agents[i];
        if (!a.alive) continue;
        const d = Math.hypot(a.body.pos.x - gf.x, a.body.pos.z - gf.z);
        if (d < gf.r) {
          damageAgent(a, 22 * dt, null, false);
          if (a.isPlayer) S.events.push({ type: 'burn' });
          if (S.rng() < 0.4) world.spawnFlame(a.body.pos.x, a.body.pos.y + 1.0, a.body.pos.z, 0.6, 2.5, 0.6, false);
        }
      }
    }
    // KARAGON is solid: push every agent out of its body
    for (let i = 0; i < S.agents.length; i += 1) {
      const a = S.agents[i];
      if (a.alive) world.pushOutKaiju(a.body.pos);
    }
  }

  function step(dt) {
    hazards(dt);
    // lasers fade
    for (let i = 0; i < lasers.length; i += 1) {
      const l = lasers[i];
      if (l.ttl > 0) {
        l.ttl -= dt;
        const k = Math.max(0, l.ttl / 0.12);
        l.core.material.opacity = k;
        l.halo.material.opacity = 0.55 * k;
        if (l.ttl <= 0) { l.core.visible = false; l.halo.visible = false; }
      }
    }
    // impact flares fade + face the camera via billboard
    for (let i = 0; i < flares.length; i += 1) {
      const f = flares[i];
      if (f.ttl > 0) {
        f.ttl -= dt;
        f.mesh.material.opacity = Math.max(0, f.ttl / 0.16) * 0.95;
        if (f.ttl <= 0) f.mesh.visible = false;
      }
    }
    for (let i = 0; i < impactLights.length; i += 1) {
      impactLights[i].intensity = Math.max(0, impactLights[i].intensity - dt * 160);
    }
    // sparks
    for (let i = 0; i < SPARKS; i += 1) {
      if (sparkTtl[i] <= 0) continue;
      sparkTtl[i] -= dt;
      if (sparkTtl[i] <= 0) { sparkPos[i * 3 + 1] = -999; continue; }
      sparkVel[i * 3 + 1] -= 9 * dt;
      sparkPos[i * 3] += sparkVel[i * 3] * dt;
      sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
      if (sparkPos[i * 3 + 1] < 0.02) { sparkPos[i * 3 + 1] = 0.02; sparkVel[i * 3 + 1] *= -0.3; }
    }
    sparkGeo.attributes.position.needsUpdate = true;
    boomLight.intensity = Math.max(0, boomLight.intensity - dt * 900);

    // grenades
    for (let i = 0; i < grenades.length; i += 1) {
      const g = grenades[i];
      if (!g.active) continue;
      g.fuse -= dt;
      g.vel.y -= 14 * dt;
      g.pos.x += g.vel.x * dt;
      g.pos.y += g.vel.y * dt;
      g.pos.z += g.vel.z * dt;
      if (g.pos.y < 0.09) {
        g.pos.y = 0.09;
        g.vel.y *= -0.38;
        g.vel.x *= 0.7; g.vel.z *= 0.7;
        g.bounced = true;
      }
      g.mesh.position.copy(g.pos);
      if (g.fuse <= 0) {
        g.active = false;
        g.mesh.visible = false;
        if (g.kind === 'smoke') {
          const smoke = { x: g.pos.x, y: 0, z: g.pos.z, r: 4.6, ttl: 15 };
          S.smokes.push(smoke);
          addSmokeVisual(smoke);
        } else {
          explode(g.pos.x, g.pos.y, g.pos.z);
        }
      }
    }
    // smokes decay
    for (let i = S.smokes.length - 1; i >= 0; i -= 1) {
      const s = S.smokes[i];
      s.ttl -= dt;
      if (s.ttl <= 0) {
        removeSmokeVisual(s);
        S.smokes.splice(i, 1);
      }
    }

    // ---- bomb ----
    const B = S.bomb;
    if (B.state === 'planted') {
      B.timer -= dt;
      const prev = B.timer;
      if (prev > 10 && B.timer <= 10) audio.beep(true);
      if (B.timer <= 0) {
        B.state = 'detonated';
        explode(B.x, 0.4, B.z);
        S.events.push({ type: 'roundEnd', winner: 'dragons', reason: 'Bomb detonated' });
      }
    }
    if (B.state === 'carried' || B.state === 'dropped') {
      const actor = B.actor;
      if (actor && actor.alive && actor.planting) {
        const site = inSite('A', actor.body.pos.x, actor.body.pos.z) ? 'A' : inSite('B', actor.body.pos.x, actor.body.pos.z) ? 'B' : null;
        if (site) {
          B.progress += dt / TUNING.plantSeconds;
          if (B.progress >= 1) {
            B.state = 'planted';
            B.site = site;
            B.timer = TUNING.bombSeconds;
            B.x = actor.body.pos.x;
            B.z = actor.body.pos.z;
            B.progress = 0;
            B.actor = null;
            B.carrier = null;
            if (actor.isPlayer) {
              S.money = Math.min(TUNING.maxMoney, S.money + TUNING.plantMoney);
              S.plants += 1;
            }
            S.feed.push({ text: `${actor.name} planted the bomb at site ${site}`, team: 'dragons', t: S.time });
            audio.plantDone();
            S.events.push({ type: 'planted', site });
          }
        } else {
          B.progress = 0;
        }
      } else {
        B.progress = 0;
      }
    } else if (B.state === 'planted') {
      const actor = B.actor;
      if (actor && actor.alive && actor.defusing) {
        const d = Math.hypot(actor.body.pos.x - B.x, actor.body.pos.z - B.z);
        if (d < 2.6) {
          B.progress += dt / TUNING.defuseSeconds;
          if (B.progress >= 1) {
            B.state = 'defused';
            B.progress = 0;
            B.actor = null;
            S.feed.push({ text: `${actor.name} defused the bomb`, team: 'djinn', t: S.time });
            S.events.push({ type: 'roundEnd', winner: 'djinn', reason: 'Bomb defused' });
          }
        } else {
          B.progress = 0;
        }
      } else {
        B.progress = 0;
      }
    }
    for (let i = 0; i < S.agents.length; i += 1) {
      const a = S.agents[i];
      if (B.actor === a && a.lastDamageT !== undefined && S.time - a.lastDamageT < 0.05) {
        if (B.progress > 0 && B.progress < 1) B.progress = 0;
      }
    }
  }

  // Drop a smoke cloud at a map position (used by the site screenshot staging;
  // in play, smoke grenades create clouds through throwGrenade instead).
  function smoke(x, z) {
    const s = { x, y: 0, z, r: 4.6, ttl: 15 };
    S.smokes.push(s);
    addSmokeVisual(s);
  }

  return { shoot, throwGrenade, explode, step, inSite, spawnSparks, spawnLaser, spawnFlare, smoke };
}
