// wildzone/client/src/systems/MeleeSystem.js
import { WEAPONS } from '../constants/weapons.js';
import { PROPS }   from '../constants/props.js';

const FIST_DAMAGE = WEAPONS.fist.damage; // 10 — kaynak çarpanı referansı

// Yarım daire tarama parametreleri
const SWEEP_ARC   = Math.PI;  // 180° toplam yay
const SWEEP_MS    = 200;      // savrulma animasyon süresi (ms)
const WINDUP_MS   = 60;       // isabet gecikmesi (ms)
const ARC_DEG     = 120;      // isabet algılama açısı (derece)

// Her silahın görsel tanımı
// handleLen: sap uzunluğu, headLen: uç uzunluğu (px cinsinden, oyuncudan dışarı)
const MELEE_VISUALS = {
  fist:    null, // yumruk için özel görsel yok
  sword:   { handleColor: 0x8B6914, handleLen: 8,  handleW: 3, headColor: 0xCCCCDD, headLen: 30, headW: 4  },
  pickaxe: { handleColor: 0x8B6914, handleLen: 22, handleW: 4, headColor: 0x4682B4, headLen: 14, headW: 5  },
  axe:     { handleColor: 0x8B6914, handleLen: 20, handleW: 4, headColor: 0xAAAAAA, headLen: 10, headW: 12 },
};

function isInMeleeArc(ax, ay, aAngle, tx, ty, range) {
  const dx   = tx - ax;
  const dy   = ty - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > range) return false;

  const angleToTarget = Math.atan2(dy, dx);
  const diff = Phaser.Math.Angle.ShortestBetween(
    Phaser.Math.RadToDeg(aAngle),
    Phaser.Math.RadToDeg(angleToTarget)
  );
  return Math.abs(diff) <= ARC_DEG / 2;
}

export default class MeleeSystem {
  constructor(scene, player) {
    this.scene    = scene;
    this.player   = player;
    this._swinging = false;
    this._lastSwingTime = 0;

    // Kalıcı silah görseli (Graphics objesi)
    this._weaponGfx = null;
    this._currentVisualId = null; // görseli hangi silah için çizdik

    // WeaponSystem._playerTargets — dışarıdan enjekte edilir
    this._playerTargets = [];
  }

  // ── Her frame çağrılır (GameScene.update'ten) ──────────────────────────
  update() {
    if (!this.player?.alive) {
      this._destroyGfx();
      return;
    }

    const weapon = this.player.inventory.getActiveWeaponData();
    const vis = MELEE_VISUALS[weapon.id];

    // Aktif silah melee değilse veya yumruksa görsel yok
    if (weapon.type !== 'melee' || !vis) {
      this._destroyGfx();
      return;
    }

    // Silah değiştiyse grafik objesini yeniden oluştur
    if (this._currentVisualId !== weapon.id) {
      this._destroyGfx();
      this._createGfx(weapon.id, vis);
    }

    // Savrulma animasyonu sırasında tween yönetsin
    if (this._swinging) return;

    // Silahı imlece yönlendir
    const { x, y } = this.player.sprite;
    const angle = this.scene.input_sys.getAimAngle(x, y, this.scene.cameras.main);
    this._positionGfx(x, y, angle);
  }

  // ── WeaponSystem melee delegesi ────────────────────────────────────────
  trySwing() {
    const now = Date.now();
    if (this._swinging) return;

    const weapon = this.player.inventory.getActiveWeaponData();
    if (now - this._lastSwingTime < weapon.cooldown) return;

    this._swinging = true;
    this._lastSwingTime = now;

    const { x, y } = this.player.sprite;
    const aimAngle = this.scene.input_sys.getAimAngle(x, y, this.scene.cameras.main);

    const vis = MELEE_VISUALS[weapon.id];

    if (!vis) {
      // Yumruk — eski basit efekt
      this._fistSwing(x, y, aimAngle, weapon);
      return;
    }

    // Yarım daire savrulma animasyonu
    this._sweepSwing(aimAngle, weapon);
  }

  // ── Yumruk (eski davranış) ─────────────────────────────────────────────
  _fistSwing(x, y, angle, weapon) {
    const hx = x + Math.cos(angle) * 55;
    const hy = y + Math.sin(angle) * 55;

    const ring = this.scene.add.circle(hx, hy, 20, 0xffa500, 0.55).setDepth(3);
    this.scene.tweens.add({
      targets:  ring,
      alpha:    0,
      scaleX:   2,
      scaleY:   2,
      duration: 250,
      onComplete: () => ring.destroy()
    });

    this.scene.time.delayedCall(WINDUP_MS, () => {
      this._detectHits(weapon);
      this.scene.time.delayedCall(weapon.cooldown * 0.25, () => {
        this._swinging = false;
      });
    });
  }

  // ── Silah savrulma (yarım daire) ──────────────────────────────────────
  _sweepSwing(aimAngle, weapon) {
    const startAngle = aimAngle - SWEEP_ARC / 2;
    const endAngle   = aimAngle + SWEEP_ARC / 2;

    // Savrulma sırasında silah grafiği yoksa geçici oluştur
    const vis = MELEE_VISUALS[weapon.id];
    if (!this._weaponGfx) this._createGfx(weapon.id, vis);

    // Animasyon başlangıcında konumla
    const { x, y } = this.player.sprite;
    this._positionGfx(x, y, startAngle);

    // Savrulma izi efekti (yarı-saydam yay)
    const trail = this.scene.add.graphics().setDepth(4);
    const totalLen = 15 + (vis.handleLen + vis.headLen);

    const progress = { t: 0 };
    this.scene.tweens.add({
      targets:  progress,
      t:        1,
      duration: SWEEP_MS,
      ease:     'Power1',
      onUpdate: () => {
        if (!this.player?.alive) return;
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;
        const currentAngle = startAngle + (endAngle - startAngle) * progress.t;
        this._positionGfx(px, py, currentAngle);

        // İz çiz
        trail.lineStyle(2, vis.headColor, 0.25 * (1 - progress.t));
        trail.beginPath();
        trail.moveTo(px + Math.cos(currentAngle) * 15, py + Math.sin(currentAngle) * 15);
        trail.lineTo(px + Math.cos(currentAngle) * totalLen, py + Math.sin(currentAngle) * totalLen);
        trail.strokePath();
      },
      onComplete: () => {
        trail.destroy();
        this._swinging = false;
      }
    });

    // İsabet — savrulmanın ortasında algıla
    this.scene.time.delayedCall(WINDUP_MS, () => {
      this._detectHits(weapon);
    });
  }

  // ── Grafik oluşturma / yok etme ───────────────────────────────────────
  _createGfx(weaponId, vis) {
    this._weaponGfx = this.scene.add.graphics().setDepth(5);
    this._currentVisualId = weaponId;
    this._drawWeapon(vis);
  }

  _drawWeapon(vis) {
    const g = this._weaponGfx;
    g.clear();

    // Sap: oyuncudan 15px offset → handleLen kadar
    g.fillStyle(vis.handleColor, 0.9);
    g.fillRect(15, -vis.handleW / 2, vis.handleLen, vis.handleW);

    // Uç (bıçak/başlık): sapın bitişinden headLen kadar
    g.fillStyle(vis.headColor, 0.95);
    const headStart = 15 + vis.handleLen;
    g.fillRect(headStart, -vis.headW / 2, vis.headLen, vis.headW);
  }

  _positionGfx(x, y, angle) {
    if (!this._weaponGfx) return;
    this._weaponGfx.setPosition(x, y);
    this._weaponGfx.setRotation(angle);
  }

  _destroyGfx() {
    if (this._weaponGfx) {
      this._weaponGfx.destroy();
      this._weaponGfx = null;
      this._currentVisualId = null;
    }
  }

  // ── İsabet algılama ────────────────────────────────────────────────────
  _detectHits(weapon) {
    if (!this.player?.alive) return;

    const { x, y } = this.player.sprite;
    const angle = this.scene.input_sys.getAimAngle(x, y, this.scene.cameras.main);
    const range = weapon.range;
    const damage = weapon.damage;
    const weaponId = weapon.id;

    // Yumruk hariç tüm yakın dövüş silahları düşmana iki kat hasar verir
    const enemyDamage = (weapon.type === 'melee' && weaponId !== 'fist') ? damage * 2 : damage;

    // 1: Barikatlar
    const barricades = this.scene.barricadeSystem?.activeBarricades ?? [];
    for (const b of barricades) {
      if (!b.image?.active) continue;
      if (isInMeleeArc(x, y, angle, b.x, b.y, range)) {
        b.takeDamage(weaponId);
      }
    }

    // 2: Düşman entity'ler
    const fakeHit = { _damage: enemyDamage };
    for (const { sprite, onHit } of this._playerTargets) {
      if (!sprite.active) continue;
      if (isInMeleeArc(x, y, angle, sprite.x, sprite.y, range)) {
        onHit(fakeHit, sprite);
      }
    }

    // 3: Prop'lar — kaynak düşürme (hasar bazlı çarpan)
    const resourceMultiplier = damage / FIST_DAMAGE;
    const nearProps = this.scene.propSystem?.getPropsNear(x, y, range + 10) ?? [];
    for (const prop of nearProps) {
      if (!isInMeleeArc(x, y, angle, prop.x, prop.y, range)) continue;

      prop.takeDamage(damage);

      const resDef = PROPS[prop.propType]?.resource;
      if (resDef && this.player.resources) {
        const amount = Math.round(resDef.perHit * resourceMultiplier);
        this.player.resources.add(resDef.type, amount);
        this.scene.events.emit('resource_changed', this.player.resources.getAll());
        this.showResourcePopup(prop.x, prop.y - 20, resDef.type, amount);
      }
    }
  }

  // Dünya koordinatında yükselen kaynak popup'ı
  showResourcePopup(wx, wy, type, amount) {
    const icons = { wood: '🪵', stone: '🪨', metal: '⚙️' };
    const label = this.scene.add.text(wx, wy, `${icons[type] ?? '+'} +${amount}`, {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    this.scene.tweens.add({
      targets:  label,
      y:        wy - 40,
      alpha:    0,
      duration: 900,
      ease:     'Power2',
      onComplete: () => label.destroy()
    });
  }

  destroy() {
    this._destroyGfx();
  }
}
