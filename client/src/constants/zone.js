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
    // Phase 1: wait 70s + shrink 40s = 110s (cumulative: 1:50)
    { waitTime: 70000, shrinkTime: 40000, targetRadius: 2200, damagePerTick: 2.5,  tickInterval: 1000 },
    // Phase 2: wait 60s + shrink 35s = 95s  (cumulative: 3:25)
    { waitTime: 60000, shrinkTime: 35000, targetRadius: 1400, damagePerTick: 3.5,  tickInterval: 1000 },
    // Phase 3 (SHIFT): wait 50s + shift 35s = 85s (cumulative: 4:50) — küçülmez, kayar
    { waitTime: 50000, shift: true, shiftTime: 35000, targetRadius: 1400, damagePerTick: 5.5, tickInterval: 1000 },
    // Phase 4: wait 30s + shrink 25s = 55s  (cumulative: 5:45)
    { waitTime: 30000, shrinkTime: 25000, targetRadius: 400,  damagePerTick: 7.5, tickInterval: 500  },
    // Phase 5: wait 20s + shrink 15s = 35s  (cumulative: 6:20) — bir noktaya daralır
    { waitTime: 20000, shrinkTime: 15000, targetRadius: 0,    damagePerTick: 8.0, tickInterval: 500  },
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
