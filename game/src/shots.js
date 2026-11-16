// DRAGONFIRE — deterministic screenshot staging for ?shot=start|play|dragon|end.
// Every shot starts from startMatch(), then teleports agents and fires scripted
// events so the frame reads as a real firefight. After staging the scene the
// sim is frozen: several renders, then window.__shotReady is set for the capture.
import { mulberry32 } from './utils.js';
import { WEAPONS, createWeaponState, weaponFire } from './weapons.js';

const STEP = 1 / 60;

function settle(game, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    game.playerStep(STEP);
    game.stepSim(STEP);
  }
  game.syncCamera();
  game.updateHud();
}

function placeBot(game, team, idx, x, z, yaw, weaponKey) {
  const bots = game.bots.bots.filter((b) => b.team === team);
  const bot = bots[idx % bots.length];
  bot.body.pos.set(x, 0, z);
  bot.body.vel.set(0, 0, 0);
  bot.body.yaw = yaw;
  bot.body.pitch = 0;
  if (weaponKey) bot.weapon = createWeaponState(WEAPONS[weaponKey]);
  bot.alive = true;
  bot.hp = 100;
  bot.fallT = 0;
  bot.parts.group.rotation.set(0, yaw, 0);
  bot.parts.group.position.set(x, 0, z);
  bot.parts.group.visible = true;
  return bot;
}

function setPlayer(game, x, z, yaw, pitch = 0) {
  const p = game.player;
  p.body.pos.set(x, 0, z);
  p.body.vel.set(0, 0, 0);
  p.body.yaw = yaw;
  p.body.pitch = pitch;
  p.alive = true;
  p.hp = 100;
}

export function runShot(game, name, seed, onReady) {
  const rng = mulberry32(seed * 7919 + 13);
  const { S } = game;
  let frames = 0;

  function finish() {
    game.syncCamera();
    game.updateHud();
    game.renderer.render(game.scene, game.camera);
    frames += 1;
    // SwiftShader's first frames are slow to composite; render several before
    // declaring the frame ready so the capture is never a black warm-up frame.
    if (frames >= 6) {
      window.__shotReady = true;
      onReady();
      return;
    }
    requestAnimationFrame(finish);
  }

  if (name === 'start') {
    game.startMatch();
    // Buy menu open, looking north-east up the souk: the dragon and a
    // helicopter in the bright sky, a burning house and the bazaar below.
    setPlayer(game, 0, 21, -0.85, 0.3);
    placeBot(game, 'dragons', 0, -3.5, 16, 0, 'rifle');
    placeBot(game, 'dragons', 1, 3.5, 17, -0.3, 'smg');
    placeBot(game, 'djinn', 0, -1, -2, Math.PI, 'rifle');
    settle(game, 0.8);
  } else if (name === 'play') {
    game.startMatch();
    S.phase = 'live';
    S.phaseTime = 0;
    S.roundTimeLeft = 100;
    game.hud.showBuy(false);
    game.equipSlot('primary');
    // Give the player a Starlance and a firefight down A-long: a clear lane,
    // the Djinn framed dead-centre so the THICK LASER crosses the frame.
    // The Djinn is 9 m out — close enough that it (and the beam) read large.
    game.player.primary = createWeaponState(WEAPONS.rifle);
    game.equipSlot('primary');
    setPlayer(game, 24, 10, -0.12);
    const enemy = placeBot(game, 'djinn', 0, 25, 1, Math.PI, 'rifle');
    placeBot(game, 'djinn', 1, 21, 4, Math.PI + 0.3, 'smg');
    placeBot(game, 'dragons', 0, 20, 5, 0.2, 'rifle');
    placeBot(game, 'dragons', 1, 28, 13, -0.1, 'smg');
    settle(game, 0.5);
    // Fire one burst at the Djinn so the laser, muzzle flash and impact
    // flare are caught mid-flight; the sim freezes right after, keeping
    // the beam in frame (its 0.12 s TTL outlasts the 0.04 s settle).
    game.player.body.yaw = Math.atan2(-(enemy.body.pos.x - game.player.body.pos.x), -(enemy.body.pos.z - game.player.body.pos.z));
    const dx = enemy.body.pos.x - game.player.body.pos.x;
    const dy = (enemy.body.pos.y + 1.1) - (game.player.body.pos.y + game.player.body.eye);
    const dz = enemy.body.pos.z - game.player.body.pos.z;
    const len = Math.hypot(dx, dy, dz);
    if (weaponFire(game.player.weapon)) {
      game.combat.shoot(game.player, dx / len, dy / len, dz / len, 0.004);
    }
    game.audio.shot('rifle', 0);
    // hold every bot's fire so no stray bot laser crosses the frame during
    // the final settle — the player's laser is the only beam in the shot
    for (const b of game.bots.bots) if (b.weapon) b.weapon.cooldown = 5;
    settle(game, 0.04);
  } else if (name === 'dragon') {
    game.startMatch();
    S.phase = 'live';
    S.phaseTime = 0;
    S.roundTimeLeft = 78;
    game.hud.showBuy(false);
    game.equipSlot('primary');
    // Spectacle shot: KARAGON breathing fire at a Djinn in the courtyard
    // while the dragon breathes fire from the sky above. Force both breaths.
    game.world.setDragonBreath(0.3);
    game.world.setKaijuPos(6, 8);
    game.world.setKaijuBreath();
    game.player.primary = createWeaponState(WEAPONS.rifle);
    game.equipSlot('primary');
    setPlayer(game, -10, 20, -1.2, 0.3);
    placeBot(game, 'djinn', 0, 10, 2, Math.PI + 0.5, 'rifle');
    placeBot(game, 'dragons', 0, 0, 10, -0.4, 'rifle');
    placeBot(game, 'djinn', 1, 16, 12, Math.PI, 'smg');
    settle(game, 0.6);
    // re-aim at the midpoint between KARAGON and the dragon so both are in frame
    const kp = game.world.kaiju.group.position;
    const dp = game.world.dragon.group.position;
    const pp = game.player.body.pos;
    const mx = (kp.x + dp.x) / 2, my = (0 + dp.y) / 2, mz = (kp.z + dp.z) / 2;
    const ddx = mx - pp.x, ddy = my - (pp.y + game.player.body.eye), ddz = mz - pp.z;
    game.player.body.yaw = Math.atan2(-ddx, -ddz);
    game.player.body.pitch = Math.atan2(ddy, Math.hypot(ddx, ddz)) * 0.85;
    game.syncCamera();
    game.updateHud();
  } else if (name === 'end') {
    game.startMatch();
    S.score.dragons = 3;
    S.score.djinn = 1;
    S.round = 4;
    S.phase = 'live';
    S.phaseTime = 0;
    S.roundTimeLeft = 41;
    game.hud.showBuy(false);
    game.player.primary = createWeaponState(WEAPONS.rifle);
    game.equipSlot('primary');
    // Move KARAGON well out of the camera's way so it cannot photobomb the
    // round-end banner (it patrols the courtyard the player stands in).
    game.world.setKaijuPos(-14, -10);
    setPlayer(game, 6, 12, 0.15);
    placeBot(game, 'dragons', 0, 0, 2, 0.3, 'rifle');
    const dead = placeBot(game, 'djinn', 0, 1, -4, Math.PI, 'rifle');
    dead.hp = 0;
    dead.alive = false;
    dead.parts.group.visible = false;
    S.feed.push({ text: 'You eliminated Bram', team: 'dragons', t: 0 });
    S.feed.push({ text: 'Zafir eliminated Kett', team: 'dragons', t: 0 });
    S.feed.push({ text: 'Bomb detonated — site A', team: 'dragons', t: 0 });
    game.endRound('dragons', 'Bomb detonated at site A');
    settle(game, 0.2);
    // re-show the banner just before the capture: its real-time timer would
    // otherwise expire during the slow SwiftShader renders (60 s is plenty)
    game.hud.banner('DRAGONS WIN THE ROUND', 'Bomb detonated at site A', 60000);
  } else {
    game.startMatch();
    settle(game, 0.5);
  }

  void rng;
  requestAnimationFrame(finish);
}
