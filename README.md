# dragonfire-fps

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/Daniikhwan/dragonfire-fps/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/Daniikhwan/dragonfire-fps/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

DRAGONFIRE — Golden Souk Tactical FPS. A round-based 5v5 tactical FPS built with three.js 0.187.0 for the make.fun threejs-fps-02 bounty. Dragons vs Djinn in a bright Middle Eastern city of sandstone walls, gold and teal domes, white minarets and a colourful bazaar. A fire-breathing dragon circles overhead, two helicopters fly the sky, and two buildings burn. Weapons are futuristic plasma guns with thick, glowing laser beams. And stomping through the courtyard is KARAGON, the Ember Titan — an original giant monster that patrols on foot and breathes a cone of fire at the nearest fighter. First team to 5 round wins takes the souk.

## Run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=vnsny7za&utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02) · AI agents build software for cash rewards</sub>

## How to play

- **Objective:** Dragons plant the bomb at site A (Dome Plaza) or B (Palace Gate); Djinn hold the sites. First to 5 rounds wins (max 9).
- **Buy menu:** between rounds (freeze time), spend round money on plasma weapons and grenades — press B or click.
- **Weapons:** Nova-9 pistol, Starlance rifle, Comet SMG, Railspike railgun, Nova Breacher scattergun, plasma + holo-smoke grenades.
- **Controls:** WASD move · mouse aim · click fire laser · right-click aim down sights · R reload · 1/2/3/4 weapon & grenade · E hold to plant · B buy · Space jump · Ctrl/C crouch · Shift walk quietly · Esc pause.

## Features

- **Spectacle:** fire-breathing dragon (flame cone + roar — its breath lands and sets the ground on fire), 2 helicopters with spinning rotors, burning buildings (flame particles, smoke columns, ember glow), **KARAGON the Ember Titan** (giant original monster, spiked back, glowing magma cracks — patrols the courtyard and breathes fire), bright saturated Middle Eastern city.
- **Dynamic hazards:** KARAGON's fire breath is a real damage cone (30 hp/s — strafe out of it, it turns slowly), and the dragon's breath leaves a burning patch on the ground (22 hp/s — move off it). Both interrupt a plant/defuse and force you to reposition every round.
- **Gunplay:** thick dual-layer laser beams (white-hot core + coloured glow halo), muzzle flash, impact flares + sparks, headshot ×3, recoil/bloom, spread by stance/movement/ADS, damage falloff.
- **Tactics:** bomb plant (3 s) / defuse (7 s) / detonation (40 s), round economy ($800 start, win +$325 / loss +$190 / kill +$300 / plant +$300), 7-item buy menu, waypoint bot AI (advance/hold/peek/plant/defuse/investigate/retreat, LOS + FOV + hearing).
- **HUD:** health, ammo, money, round timer, score, killfeed, crosshair, hitmarker, bomb status, minimap, damage indicator, buy/pause/settings menus, spectate.
- **Audio:** fully synthesized WebAudio (laser zaps, dragon roar, rotor thump, explosions) — zero audio files.

## Package

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by an AI agent for make.fun. Three.js 0.187.0 vendored unmodified.
