// wildzone/client/src/constants/zone.js
// Zone shrinking mechanic constants — Phase 4

import CONSTANTS from '../constants.js';

const MAP_CX = CONSTANTS.MAP_WIDTH / 2;
const MAP_CY = CONSTANTS.MAP_HEIGHT / 2;

// İlk güvenli alan yarıçapı — haritanın köşelerine kadar ulaşır
const INITIAL_RADIUS = Math.hypot(MAP_CX, MAP_CY); // ~4243

export const ZONE = {
  INITIAL_CENTER: { x: MAP_CX, y: MAP_CY },
  INITIAL_RADIUS,

  // Merkez çekimi: yeni merkez, harita merkezine %40 çekilir (kenar zonları engeller)
  CENTER_GRAVITY: 0.4,

  // Faz tablosu — toplam 380 saniye (6dk 20sn)
  PHASES: [
    // Phase 1: wait 60s + shrink 40s = 100s (cumulative: 1:40)
    { waitTime: 60000, shrinkTime: 40000, targetRadius: 2200, damagePerTick: 3,  tickInterval: 1000 },
    // Phase 2: wait 50s + shrink 35s = 85s  (cumulative: 3:05)
    { waitTime: 50000, shrinkTime: 35000, targetRadius: 1400, damagePerTick: 5,  tickInterval: 1000 },
    // Phase 3: wait 40s + shrink 30s = 70s  (cumulative: 4:15)
    { waitTime: 40000, shrinkTime: 30000, targetRadius: 800,  damagePerTick: 7,  tickInterval: 1000 },
    // Phase 4: wait 30s + shrink 25s = 55s  (cumulative: 5:10)
    { waitTime: 30000, shrinkTime: 25000, targetRadius: 400,  damagePerTick: 11, tickInterval: 500  },
    // Phase 5: wait 20s + shrink 15s = 35s  (cumulative: 5:45)
    { waitTime: 20000, shrinkTime: 15000, targetRadius: 150,  damagePerTick: 15, tickInterval: 500  },
    // Phase 6: wait 10s + shrink 25s = 35s  (cumulative: 6:20)
    { waitTime: 10000, shrinkTime: 25000, targetRadius: 50,   damagePerTick: 24, tickInterval: 250  },
  ],

  // Renk — KIRMIZI (kullanıcı talebi: kırmızı saydam filtre)
  OVERLAY_COLOR: 0xFF0000,
  OVERLAY_ALPHA: 0.28,
  BORDER_COLOR: 0xFF4444,
  BORDER_WIDTH: 3,
  BORDER_ALPHA: 0.9,

  // Vignette (oyuncu zone dışındayken)
  VIGNETTE_COLOR: 0xFF0000,
  VIGNETTE_ALPHA: 0.4,
  VIGNETTE_THICKNESS: 50,
};

// Harita sınır bölgesi — oyun başında sadece harita dışı hasar verir
export const BOUNDARY_ZONE = {
  DAMAGE_PER_TICK: 6,
  TICK_INTERVAL: 500,
};

export default ZONE;
