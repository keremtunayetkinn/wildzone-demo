// wildzone/client/src/systems/ZoneSystem.js
// Faz durum makinesi — güvenli alanın daralma mantığı

import CONSTANTS from '../constants.js';
import { ZONE } from '../constants/zone.js';

// Durum sabitleri
const STATE = { WAITING: 'waiting', SHRINKING: 'shrinking', FINISHED: 'finished' };

export default class ZoneSystem {
  constructor(scene) {
    this.scene = scene;

    // Mevcut güvenli alan (daire)
    this.center = { ...ZONE.INITIAL_CENTER };
    this.radius = ZONE.INITIAL_RADIUS;

    // Hedef güvenli alan (daraltılacak)
    this.targetCenter = { ...this.center };
    this.targetRadius = this.radius;

    // Önceki güvenli alan (interpolasyon başlangıcı)
    this._fromCenter = { ...this.center };
    this._fromRadius = this.radius;

    // Faz takibi
    this.phaseIndex = -1; // henüz başlamadı
    this.state = STATE.WAITING;
    this._stateStart = 0;
    this._started = false;

    // Zamanlayıcı
    this._elapsed = 0;
  }

  /** Oyun başladığında çağrılır */
  start() {
    if (this._started) return;
    this._started = true;
    this._elapsed = 0;
    this._advancePhase(); // Phase 0 (ilk faz) bekleme süresini başlat
  }

  /** Her frame çağrılır (delta ms) */
  update(delta) {
    if (!this._started || this.state === STATE.FINISHED) return;

    this._elapsed += delta;
    const phase = ZONE.PHASES[this.phaseIndex];
    if (!phase) return;

    const stateElapsed = this._elapsed - this._stateStart;

    if (this.state === STATE.WAITING) {
      if (stateElapsed >= phase.waitTime) {
        // Bekleme bitti → daralma başlat
        this.state = STATE.SHRINKING;
        this._stateStart = this._elapsed;
        this._fromCenter = { ...this.center };
        this._fromRadius = this.radius;
        this._calculateTarget(phase);
        this.scene.events.emit('zone_shrink_start', {
          phaseIndex: this.phaseIndex,
          targetCenter: this.targetCenter,
          targetRadius: this.targetRadius,
          duration: phase.shrinkTime
        });
      }
    } else if (this.state === STATE.SHRINKING) {
      const t = Math.min(stateElapsed / phase.shrinkTime, 1);
      const eased = this._easeInOutCubic(t);

      // Merkez ve yarıçap interpolasyonu
      this.center.x = this._fromCenter.x + (this.targetCenter.x - this._fromCenter.x) * eased;
      this.center.y = this._fromCenter.y + (this.targetCenter.y - this._fromCenter.y) * eased;
      this.radius = this._fromRadius + (this.targetRadius - this._fromRadius) * eased;

      if (t >= 1) {
        // Daralma tamamlandı
        this.center.x = this.targetCenter.x;
        this.center.y = this.targetCenter.y;
        this.radius = this.targetRadius;
        this.scene.events.emit('zone_shrink_complete', { phaseIndex: this.phaseIndex });

        // Sonraki faz var mı?
        if (this.phaseIndex < ZONE.PHASES.length - 1) {
          this._advancePhase();
        } else {
          this.state = STATE.FINISHED;
          this.scene.events.emit('zone_finished');
        }
      }
    }
  }

  /** Oyuncu güvenli alanda mı? */
  isInsideZone(x, y) {
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    return (dx * dx + dy * dy) <= (this.radius * this.radius);
  }

  /** Oyuncu harita sınırları içinde mi? */
  isInsideMap(x, y) {
    return x >= 0 && x <= CONSTANTS.MAP_WIDTH && y >= 0 && y <= CONSTANTS.MAP_HEIGHT;
  }

  /** Mevcut fazın hasar bilgisi */
  getCurrentDamage() {
    if (this.phaseIndex < 0) return { damage: 0, interval: 1000 };
    const phase = ZONE.PHASES[this.phaseIndex];
    if (!phase) return { damage: 0, interval: 1000 };
    return { damage: phase.damagePerTick, interval: phase.tickInterval };
  }

  /** Kalan süre bilgisi (HUD için) */
  getTimerInfo() {
    if (!this._started || this.state === STATE.FINISHED) {
      return { state: this.state, remaining: 0, phaseIndex: this.phaseIndex, total: ZONE.PHASES.length };
    }
    const phase = ZONE.PHASES[this.phaseIndex];
    if (!phase) return { state: this.state, remaining: 0, phaseIndex: this.phaseIndex, total: ZONE.PHASES.length };

    const stateElapsed = this._elapsed - this._stateStart;
    let remaining;
    if (this.state === STATE.WAITING) {
      remaining = Math.max(0, phase.waitTime - stateElapsed);
    } else {
      remaining = Math.max(0, phase.shrinkTime - stateElapsed);
    }

    return {
      state: this.state,
      remaining,
      phaseIndex: this.phaseIndex,
      total: ZONE.PHASES.length
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _advancePhase() {
    this.phaseIndex++;
    this.state = STATE.WAITING;
    this._stateStart = this._elapsed;
    this.scene.events.emit('zone_phase_change', {
      phaseIndex: this.phaseIndex,
      state: this.state
    });
  }

  /** Hedef merkez ve yarıçapı hesapla (rastgele, merkez çekimli) */
  _calculateTarget(phase) {
    const r = phase.targetRadius;

    // Rastgele açı ve uzaklık
    const angle = Math.random() * Math.PI * 2;
    // Maksimum kayma: mevcut yarıçap - hedef yarıçap (güvenli alan içinde kalmalı)
    const maxShift = Math.max(0, this.radius - r);
    const shift = Math.random() * maxShift;

    let newCX = this.center.x + Math.cos(angle) * shift;
    let newCY = this.center.y + Math.sin(angle) * shift;

    // Merkez çekimi (gravity) — harita merkezine doğru %40 çek
    const mapCX = CONSTANTS.MAP_WIDTH / 2;
    const mapCY = CONSTANTS.MAP_HEIGHT / 2;
    newCX = newCX + (mapCX - newCX) * ZONE.CENTER_GRAVITY;
    newCY = newCY + (mapCY - newCY) * ZONE.CENTER_GRAVITY;

    // Harita sınırlarında kal: hedef dairenin taşmasını engelle
    newCX = Math.max(r, Math.min(CONSTANTS.MAP_WIDTH - r, newCX));
    newCY = Math.max(r, Math.min(CONSTANTS.MAP_HEIGHT - r, newCY));

    this.targetCenter = { x: newCX, y: newCY };
    this.targetRadius = r;
  }

  /** Ease-in-out cubic interpolasyon */
  _easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  destroy() {
    this._started = false;
    this.state = STATE.FINISHED;
  }
}
