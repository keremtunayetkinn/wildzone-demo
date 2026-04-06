// wildzone/client/src/constants/barricades.js

export const BARRICADE = {
  tileSize:  128,
  length:    128,   // 1 × tileSize
  thickness: 14,
  maxActive: 5,

  // Materyal listesi (Q ile döngülenir)
  materials: {
    wood: {
      label:    'Ahşap',
      cost:     { type: 'wood',  amount: 25 },  // bol kaynak → daha fazla birim
      maxHP:    80,                              // geçici/atılabilir
      colors:   { full: 0x8B6914, damaged1: 0x7A5C10, damaged2: 0x6B4F0C, critical: 0x5C4008 },
      preview:  0xc8a060,
    },
    stone: {
      label:    'Taş',
      cost:     { type: 'stone', amount: 12 },  // respawn yok → az birim ama kalıcı harcama
      maxHP:    220,
      colors:   { full: 0x888888, damaged1: 0x707070, damaged2: 0x585858, critical: 0x404040 },
      preview:  0xaaaaaa,
    },
    metal: {
      label:    'Metal',
      cost:     { type: 'metal', amount: 8 },   // en nadir kaynak → en az birim, yüksek HP
      maxHP:    420,                             // premium: taştan ~2x, ahşaptan ~5x
      colors:   { full: 0x7799aa, damaged1: 0x5f7f99, damaged2: 0x4a6880, critical: 0x375060 },
      preview:  0x88ccee,
    },
  },

  // Hasar: her silah türüne göre barikat HP düşümü
  damage: {
    fist:           25,
    sword:          20,
    pickaxe:        35,
    axe:            45,
    pistol:         10,
    shotgun:        8,
    smg:            8,
    sniper:         20,
    bazooka:        50,
    harpoon:        10,
    bullet_default: 10,
  },

  alphas: {
    full:     1.0,
    damaged1: 0.9,
    damaged2: 0.75,
    critical: 0.55,
  },
};
