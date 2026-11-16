// DRAGONFIRE — palette and tuning constants shared by every module.
// A bright, saturated Middle Eastern city at golden hour: turquoise sky,
// sandstone walls, gold and teal domes, magenta bazaar awnings, burning
// buildings. Nothing drab — every colour in the game is vivid on purpose.
export const PALETTE = {
  canvas: 0x1a2f4a,
  fog: 0xd8b98a,
  skyTop: '#2e7fd6',
  skyMid: '#5fb8e8',
  skyLow: '#ffd98a',
  sun: 0xfff2c0,
  sunIntensity: 3.0,
  hemiSky: 0x9fd4ff,
  hemiGround: 0xc9a06a,
  hemiIntensity: 0.9,
  ground: 0xd9b380,
  sand: 0xe8c890,
  sandstone: 0xe0c090,
  sandstoneDark: 0xb89a68,
  whitewash: 0xf5ead0,
  turquoise: 0x18b8c8,
  turquoiseDark: 0x0e7a88,
  gold: 0xffc233,
  goldDark: 0xd8901a,
  magenta: 0xe83a8c,
  orange: 0xff7a28,
  crimson: 0xd43a2a,
  violet: 0xb45cff,
  teal: 0x18c8a8,
  palmGreen: 0x3aa84a,
  wood: 0x8a5a28,
  metal: 0x9aa4ac,
  metalDark: 0x5a646c,
  flame: 0xff8a1e,
  ember: 0xffc860,
  smoke: 0x4a4640,
  // teams — bright and unmistakable at a glance
  dragons: 0xffc233, // player team: gold
  dragonsAlt: 0xff5a3a, // crimson accent
  djinn: 0xb45cff, // enemy team: violet
  djinnAlt: 0x18e8c8, // teal accent
  tracerDragons: 0x00b8ff, // deep cyan plasma — reads as colour, not white, additively
  tracerDjinn: 0xff2ea8, // deep magenta plasma
  white: 0xfff8ea,
  muted: 0x8a94a0,
};

export const TUNING = {
  roundTarget: 5,
  maxRounds: 9,
  freezeSeconds: 3,
  roundSeconds: 100,
  plantSeconds: 3,
  defuseSeconds: 7,
  bombSeconds: 40,
  winMoney: 325,
  lossMoney: 190,
  killMoney: 300,
  plantMoney: 300,
  startMoney: 800,
  maxMoney: 16000,
  playerHp: 100,
  eyeStanding: 1.62,
  eyeCrouched: 1.12,
  walkSpeed: 4.6,
  runSpeed: 5.6,
  crouchSpeed: 2.4,
  accel: 38,
  friction: 26,
  gravity: 18,
  jumpSpeed: 6.4,
  agentRadius: 0.36,
};
