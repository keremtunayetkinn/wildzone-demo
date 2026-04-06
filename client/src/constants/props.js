// wildzone/client/src/constants/props.js

export const PROPS = {
  tree: {
    key:            'tree',
    displayWidth:   72,
    displayHeight:  78,
    colliderType:   'circle',
    colliderRadius: 27,
    colliderOffsetX: 9,
    colliderOffsetY: 9,
    maxHP:          60,
    respawnTime:    120_000,   // 120 saniye
    resource:       { type: 'wood', perHit: 5 },
    depth:          1,
  },

  rock: {
    key:            'rock',
    displayWidth:   60,
    displayHeight:  48,
    colliderType:   'box',
    colliderWidth:  48,
    colliderHeight: 33,
    maxHP:          80,
    respawnTime:    null,      // respawn yok
    resource:       { type: 'stone', perHit: 4 },
    depth:          1,
  },

  // 'bush_prop' = haritadaki kırılabilir çalı
  // 'bush'      = kamuflaj silahı — bunlarla çakışma yok
  bush_prop: {
    key:            'bush',
    displayWidth:   54,
    displayHeight:  42,
    colliderType:   'box',
    colliderWidth:  42,
    colliderHeight: 30,
    maxHP:          20,
    respawnTime:    60_000,    // 60 saniye
    resource:       { type: 'wood', perHit: 2 },
    depth:          1,
  },

  metal_crate: {
    key:            'metal_crate',
    displayWidth:   60,
    displayHeight:  60,
    colliderType:   'box',
    colliderWidth:  54,
    colliderHeight: 54,
    maxHP:          120,
    respawnTime:    null,
    resource:       { type: 'metal', perHit: 6 },
    depth:          1,
  },
};
