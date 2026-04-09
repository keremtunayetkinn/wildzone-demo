// wildzone/client/src/systems/ZoneDamageSystem.js
// Zone dışındaki oyunculara hasar verir — zırhı BYPASS eder (doğrudan HP)

import { BOUNDARY_ZONE } from '../constants/zone.js';

export default class ZoneDamageSystem {
  constructor(scene, zoneSystem) {
    this.scene = scene;
    this.zone = zoneSystem;

    this._lastZoneTick = 0;    // son zone hasar tick zamanı
    this._lastBoundTick = 0;   // son harita sınırı hasar tick zamanı
  }

  /** Her frame çağrılır */
  update(time, player) {
    if (!player || !player.alive) return;

    const px = player.sprite.x;
    const py = player.sprite.y;

    // 1) Harita sınır hasarı (her zaman aktif)
    if (!this.zone.isInsideMap(px, py)) {
      if (time - this._lastBoundTick >= BOUNDARY_ZONE.TICK_INTERVAL) {
        this._lastBoundTick = time;
        this._applyZoneDamage(player, BOUNDARY_ZONE.DAMAGE_PER_TICK);
      }
      return; // harita dışındaysa zone kontrolüne gerek yok
    }

    // 2) Zone hasarı (faz başladıktan sonra, güvenli alan dışındaysa)
    if (this.zone.phaseIndex < 0) return; // henüz başlamadı

    if (!this.zone.isInsideZone(px, py)) {
      const { damage, interval } = this.zone.getCurrentDamage();
      if (damage > 0 && time - this._lastZoneTick >= interval) {
        this._lastZoneTick = time;
        this._applyZoneDamage(player, damage);
      }
    }
  }

  /** Zırhı bypass ederek doğrudan HP düşürür */
  _applyZoneDamage(player, amount) {
    player.setHP(player.hp - amount);
    this.scene.events.emit('zone_damage', { amount, hp: player.hp });

    // HP 0'a düşünce ölümü tetikle
    if (player.hp <= 0 && player.alive) {
      this.scene.events.emit('zone_killed_player');
    }

    // Kısa kırmızı flash efekti
    if (player.sprite && player.sprite.active) {
      player.sprite.setTint(0xff4444);
      this.scene.time.delayedCall(150, () => {
        if (player.sprite && player.sprite.active) player.sprite.clearTint();
      });
    }
  }

  destroy() {
    // cleanup
  }
}
