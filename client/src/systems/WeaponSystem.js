// wildzone/client/src/systems/WeaponSystem.js
import { WEAPONS } from '../constants/weapons.js';

const BULLET_COLORS = {
  pistol:  0xffff00,
  shotgun: 0xffff00,
  smg:     0xffff00,
  sniper:  0xffff00,
  bazooka: 0xffff00,
  harpoon: 0x888888
};

export default class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
    this.bullets = scene.physics.add.group();
    this._playerTargets = []; // { sprite, onHit } — fizik body gerektirmez

    // Cooldown tracking per slot key
    this._lastFireTime = { 0: 0, 1: 0, 2: 0 };

    // SMG spread warmup
    this._smgShotCount = 0;
    this._smgLastFireTime = 0;

    // Reload state
    this.isReloading = false;
    this._reloadEvent = null;

    // Harpoon state
    this._activeHarpoon = null; // { bullet, rope, phase, anchorX, anchorY, targetSprite, pullType, pullTimer, pullDuration, pullSpeed }
  }

  // inventory: InventorySystem, network: NetworkSystem (optional)
  tryFire(x, y, angle, network, inventory) {
    if (!inventory) return false;
    if (this.isReloading) return false;

    // Zıpkın uçuştayken hiçbir silah ateşlenemez
    // Çekme fazında ise zıpkın dışındaki silahlarla ateş serbest
    if (this._activeHarpoon) {
      if (this._activeHarpoon.phase === 'flight') return false;
      if (inventory.getActiveWeaponData()?.id === 'harpoon') return false;
    }

    const weapon = inventory.getActiveWeaponData();
    const slot = inventory.activeSlot;
    const now = Date.now();

    // Cooldown check
    if (now - (this._lastFireTime[slot] || 0) < weapon.cooldown) return false;

    // Melee (fist) — MeleeSystem'e delege et
    if (weapon.type === 'melee') {
      this._lastFireTime[slot] = now;
      this.scene.meleeSystem?.trySwing();
      return true;
    }

    // Utility (bush) — handled by player camouflage, not here
    if (weapon.type === 'utility') return false;

    // Ranged — check magazine
    if (inventory.getMagazineAmmo() <= 0) {
      this.startReload(inventory);
      return false;
    }

    this._lastFireTime[slot] = now;
    inventory.useAmmo();

    // Fire by weapon type
    if (weapon.id === 'harpoon') {
      this._fireHarpoon(x, y, angle, weapon);
    } else if (weapon.id === 'shotgun') {
      this._fireShotgun(x, y, angle, weapon);
    } else if (weapon.id === 'bazooka') {
      this._fireMissile(x, y, angle, weapon);
    } else {
      const spread = this._calcSpread(weapon);
      const jitter = (Math.random() - 0.5) * 2 * (spread * Math.PI / 180);
      this._spawnBullet(x, y, angle + jitter, weapon, true);
    }

    // SMG warmup tracking
    if (weapon.id === 'smg') {
      this._smgShotCount++;
      this._smgLastFireTime = now;
    } else {
      this._smgShotCount = 0;
    }

    // Network broadcast
    if (network) {
      const effectiveRange = weapon.range === Infinity ? 5000 : weapon.range;
      const tx = x + Math.cos(angle) * effectiveRange;
      const ty = y + Math.sin(angle) * effectiveRange;
      network.sendShoot(tx, ty);
    }

    return true;
  }

  _calcSpread(weapon) {
    if (weapon.id === 'smg') {
      const now = Date.now();
      if (now - this._smgLastFireTime > weapon.spreadCooldown) {
        this._smgShotCount = 0;
      }
      if (this._smgShotCount > weapon.spreadWarmup) return weapon.spreadMax;
      if (this._smgShotCount > Math.floor(weapon.spreadWarmup / 2)) {
        return weapon.spread + (weapon.spreadMax - weapon.spread) * 0.5;
      }
      return weapon.spread;
    }
    if (weapon.id === 'sniper') {
      return weapon.spreadMoving || 3;
    }
    return weapon.spread || 0;
  }

  _fireShotgun(x, y, angle, weapon) {
    // 6 pellets at ±25°, evenly distributed
    const angles = [-25, -15, -5, 5, 15, 25];
    angles.forEach(deg => {
      const a = angle + deg * Math.PI / 180;
      this._spawnBullet(x, y, a, weapon, true);
    });
  }

  _fireMissile(x, y, angle, weapon) {
    const bullet = this._spawnBullet(x, y, angle, weapon, true);
    bullet._isMissile = true;
    bullet._splashRadius = weapon.splashRadius;
    bullet._splashDamage = weapon.splashDamage;
    return bullet;
  }

  // ---- Harpoon ----

  _fireHarpoon(x, y, angle, weapon) {
    // Zaten aktif zıpkın varsa ateşleme
    if (this._activeHarpoon) return null;

    const bullet = this._spawnBullet(x, y, angle, weapon, true);
    bullet._isHarpoon = true;

    const rope = this.scene.add.graphics().setDepth(2);

    this._activeHarpoon = {
      bullet,
      rope,
      phase: 'flight',    // 'flight' | 'pulling'
      anchorX: 0,
      anchorY: 0,
      targetSprite: null, // oyuncuya saplandıysa
      pullType: null,     // 'obstacle' | 'player'
      pullTimer: 0,
      pullDuration: weapon.pullDuration || 0.45,
      pullSpeed: weapon.pullSpeed || 450
    };

    return bullet;
  }

  _calcPullDuration(anchorX, anchorY, minDuration) {
    const player = this.scene.player;
    if (!player?.sprite) return minDuration;
    const dx = anchorX - player.sprite.x;
    const dy = anchorY - player.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Mesafeye göre gereken süre; en az minDuration kadar
    return Math.max(minDuration, dist / (this._activeHarpoon?.pullSpeed || 450));
  }

  _harpoonHitObstacle(bullet) {
    if (!this._activeHarpoon || this._activeHarpoon.bullet !== bullet) return;
    const h = this._activeHarpoon;
    h.anchorX = bullet.x;
    h.anchorY = bullet.y;
    h.pullType = 'obstacle';
    h.phase = 'pulling';
    h.pullDuration = this._calcPullDuration(bullet.x, bullet.y, h.pullDuration);
    h.bullet = null;

    // Mermiyi yok et
    bullet.destroy();
    this.bullets.remove(bullet, true, true);
  }

  _harpoonHitPlayer(bullet, sprite, onHit) {
    if (!this._activeHarpoon || this._activeHarpoon.bullet !== bullet) return;
    const h = this._activeHarpoon;

    // 15 hasar ver
    onHit(bullet, sprite);

    h.anchorX = sprite.x;
    h.anchorY = sprite.y;
    h.targetSprite = sprite;
    h.pullType = 'player';
    h.phase = 'pulling';
    h.pullDuration = this._calcPullDuration(sprite.x, sprite.y, h.pullDuration);
    h.bullet = null;

    // Mermiyi yok et
    bullet.destroy();
    this.bullets.remove(bullet, true, true);
  }

  _updateHarpoon(delta) {
    if (!this._activeHarpoon) return;
    const h = this._activeHarpoon;
    const player = this.scene.player;
    if (!player?.alive) { this._cleanupHarpoon(); return; }

    const px = player.sprite.x;
    const py = player.sprite.y;

    h.rope.clear();
    h.rope.lineStyle(2, 0x8B7355, 0.85);

    if (h.phase === 'flight') {
      // Mermi hâlâ uçuyor — ip çiz
      if (!h.bullet || !h.bullet.active) {
        // Mermi menzil dışına çıktı, isabet etmedi
        this._cleanupHarpoon();
        return;
      }
      h.rope.beginPath();
      h.rope.moveTo(px, py);
      h.rope.lineTo(h.bullet.x, h.bullet.y);
      h.rope.strokePath();
    } else if (h.phase === 'pulling') {
      let ax = h.anchorX;
      let ay = h.anchorY;

      // Oyuncuya saplandıysa, hedefin güncel konumunu takip et
      if (h.targetSprite?.active) {
        ax = h.targetSprite.x;
        ay = h.targetSprite.y;
      }

      // İp çiz
      h.rope.beginPath();
      h.rope.moveTo(px, py);
      h.rope.lineTo(ax, ay);
      h.rope.strokePath();

      const dx = ax - px;
      const dy = ay - py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 24) {
        const nx = dx / dist;
        const ny = dy / dist;

        // Oyuncuyu çekme noktasına çek
        player.sprite.setVelocity(nx * h.pullSpeed, ny * h.pullSpeed);

        // Oyuncuya saplandıysa hedefi de oyuncuya çek
        if (h.pullType === 'player' && h.targetSprite?.active) {
          const tx = -nx * h.pullSpeed;
          const ty = -ny * h.pullSpeed;

          // TestBot — doğrudan pozisyon güncelle (static body, velocity yok)
          if (this.scene.testBot?.sprite === h.targetSprite) {
            h.targetSprite.x += tx * delta;
            h.targetSprite.y += ty * delta;
            // Bot görsel öğelerini güncelle
            const bot = this.scene.testBot;
            if (bot.nameLabel) { bot.nameLabel.x = h.targetSprite.x; bot.nameLabel.y = h.targetSprite.y - 46; }
            if (bot.hpBarBg)   { bot.hpBarBg.x = h.targetSprite.x; bot.hpBarBg.y = h.targetSprite.y - 38; }
            if (bot.hpBar)     { bot.hpBar.x = h.targetSprite.x - 25; bot.hpBar.y = h.targetSprite.y - 38; }
          } else {
            // RemotePlayer — client-side pozisyon kaydır
            h.targetSprite.x += tx * delta;
            h.targetSprite.y += ty * delta;
          }
        }
      }

      h.pullTimer += delta;
      if (h.pullTimer >= h.pullDuration || dist <= 24) {
        this._cleanupHarpoon();
      }
    }
  }

  _cleanupHarpoon() {
    if (!this._activeHarpoon) return;
    const h = this._activeHarpoon;
    if (h.rope) h.rope.destroy();
    if (h.bullet?.active) {
      h.bullet.destroy();
      this.bullets.remove(h.bullet, true, true);
    }
    this._activeHarpoon = null;
  }

  _spawnBullet(x, y, angle, weapon, isLocal) {
    const color = BULLET_COLORS[weapon.id] || 0xffff00;
    const isBazooka = weapon.id === 'bazooka';
    const isSniper = weapon.id === 'sniper';
    const isHarpoon = weapon.id === 'harpoon';
    const w = isBazooka ? 14 : isHarpoon ? 16 : (isSniper ? 10 : 7);
    const h = isBazooka ? 7 : isHarpoon ? 3 : (isSniper ? 4 : 4);

    const bullet = this.scene.add.rectangle(x, y, w, h, color).setDepth(2);

    bullet.isLocal = isLocal;
    bullet.spawnX = x;
    bullet.spawnY = y;
    bullet._weaponId = weapon.id;
    bullet._damage = weapon.damage;
    bullet._range = weapon.range;
    bullet._isMissile = false;
    bullet._isHarpoon = false;
    bullet._splashRadius = 0;
    bullet._splashDamage = 0;

    this.bullets.add(bullet, false);
    this.scene.physics.add.existing(bullet);

    bullet.setRotation(angle);
    bullet.body.setAllowGravity(false);
    bullet.body.setVelocity(
      Math.cos(angle) * weapon.bulletSpeed,
      Math.sin(angle) * weapon.bulletSpeed
    );

    return bullet;
  }

  // ---- Reload ----

  startReload(inventory) {
    if (this.isReloading) return;
    const weapon = inventory.getActiveWeaponData();
    if (!weapon.ammoType || !inventory.canReload()) return;

    this.isReloading = true;
    this.scene.events.emit('reload_start', { weaponId: weapon.id, duration: weapon.reloadTime });

    if (weapon.reloadType === 'per_shell') {
      this._shotgunReloadStep(inventory);
    } else {
      this._reloadEvent = this.scene.time.addEvent({
        delay: weapon.reloadTime,
        callback: () => {
          inventory.reload();
          this.isReloading = false;
          this.scene.events.emit('reload_complete');
          this.scene.events.emit('inventory_changed');
        }
      });
    }
  }

  _shotgunReloadStep(inventory) {
    if (!this.isReloading) return;

    const added = inventory.reloadOneShell();
    this.scene.events.emit('inventory_changed');

    if (!added || !inventory.canReload()) {
      this.isReloading = false;
      this.scene.events.emit('reload_complete');
      return;
    }

    this._reloadEvent = this.scene.time.addEvent({
      delay: 600,
      callback: () => this._shotgunReloadStep(inventory)
    });
  }

  cancelReload() {
    if (this._reloadEvent) {
      this._reloadEvent.remove(false);
      this._reloadEvent = null;
    }
    this.isReloading = false;
  }

  disableZoom() {}

  // ---- Remote bullets (network) ----

  spawnRemoteBullet(x, y, targetX, targetY) {
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const bullet = this.scene.add.rectangle(x, y, 7, 4, 0xffff00).setDepth(2);
    bullet.isLocal = false;
    bullet.spawnX = x;
    bullet.spawnY = y;
    bullet._range = 800;
    bullet._weaponId = 'pistol';
    bullet._isMissile = false;
    bullet._splashRadius = 0;
    this.bullets.add(bullet, false);
    this.scene.physics.add.existing(bullet);
    bullet.setRotation(angle);
    bullet.body.setAllowGravity(false);
    bullet.body.setVelocity(
      Math.cos(angle) * WEAPONS.pistol.bulletSpeed,
      Math.sin(angle) * WEAPONS.pistol.bulletSpeed
    );
  }

  // ---- Colliders ----

  addCollider(staticGroup) {
    this.scene.physics.add.collider(this.bullets, staticGroup, (bullet, staticObj) => {
      if (!bullet.active) return;
      if (bullet._isHarpoon) {
        this._harpoonHitObstacle(bullet);
        return;
      }
      if (bullet._isMissile) {
        this._explodeMissile(bullet);
        bullet.destroy();
        this.bullets.remove(bullet, true, true);
        return;
      }
      // Barikat hasarı
      if (staticObj?._barricadeRef) {
        staticObj._barricadeRef.takeDamage(bullet._weaponId ?? 'bullet_default');
      }
      bullet.destroy();
      this.bullets.remove(bullet, true, true);
    });
  }

  addPlayerOverlap(playerSprite, onHit) {
    // Fizik body'siz sprite'larla da çalışan manuel mesafe sistemi
    this._playerTargets.push({ sprite: playerSprite, onHit });
  }

  _explodeMissile(bullet) {
    const r   = bullet._splashRadius || 100;
    const dmg = bullet._splashDamage || 40;
    const cx  = bullet.x;
    const cy  = bullet.y;

    const circle = this.scene.add.circle(cx, cy, r,       0xff4500, 0.55).setDepth(3);
    const inner  = this.scene.add.circle(cx, cy, r * 0.4, 0xffff00, 0.7 ).setDepth(4);
    this.scene.tweens.add({
      targets: [circle, inner],
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 450,
      onComplete: () => { circle.destroy(); inner.destroy(); }
    });
    this.scene.cameras.main.shake(200, 0.015);

    // Splash damage to barricades in radius (linear falloff)
    if (this.scene.barricadeSystem) {
      for (const b of [...this.scene.barricadeSystem.activeBarricades]) {
        if (!b.image?.active) continue;
        const dx = b.x - cx, dy = b.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < r) {
          const falloff = 1 - dist / r;
          b.takeDamage('bazooka', falloff);
        }
      }
    }

    // Splash damage to props in radius (linear falloff)
    if (this.scene.propSystem) {
      for (const p of this.scene.propSystem.props) {
        if (!p.active) continue;
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < r) {
          const falloff = 1 - dist / r;
          p.takeDamage(Math.round(dmg * falloff));
        }
      }
    }

    // Alan hasarını sahneye bildir
    this.scene.events.emit('missile_explode', { x: cx, y: cy, radius: r, damage: dmg });
  }

  // ---- Update (range cleanup) ----

  update(delta) {
    // Zıpkın ip + çekme güncellemesi
    this._updateHarpoon(delta || this.scene.game.loop.delta / 1000);

    const children = this.bullets.getChildren().slice();
    for (const bullet of children) {
      if (!bullet.active) continue;

      const dx = bullet.x - bullet.spawnX;
      const dy = bullet.y - bullet.spawnY;
      const distSq = dx * dx + dy * dy;
      const range = bullet._range || 800;

      let expired;
      if (range === Infinity) {
        const bounds = this.scene.physics.world.bounds;
        expired = bullet.x < -50 || bullet.x > bounds.width + 50 ||
                  bullet.y < -50 || bullet.y > bounds.height + 50;
      } else {
        expired = distSq >= range * range;
      }

      if (expired) {
        if (bullet._isHarpoon && bullet.isLocal) {
          // Menzil dışı — çekme yok, temizle
          this._cleanupHarpoon();
          continue;
        }
        if (bullet._isMissile && bullet.isLocal) this._explodeMissile(bullet);
        bullet.destroy();
        this.bullets.remove(bullet, true, true);
        continue;
      }

      // Sadece local mermi vuruş kontrolü yapar (remote mermi sunucu güdümlü)
      if (!bullet.isLocal) continue;

      // Tüm silah türleri için birleşik manuel çarpışma kontrolü
      // Fizik body gerektirmez — x/y pozisyonu doğrudan kontrol edilir
      const hitR = bullet._isMissile ? 28 : 22;
      const hitR2 = hitR * hitR;

      for (const { sprite, onHit } of this._playerTargets) {
        if (!sprite.active) continue;
        const tdx = sprite.x - bullet.x;
        const tdy = sprite.y - bullet.y;
        if (tdx * tdx + tdy * tdy < hitR2) {
          if (bullet._isHarpoon) {
            this._harpoonHitPlayer(bullet, sprite, onHit);
          } else if (bullet._isMissile) {
            this._explodeMissile(bullet);
            bullet.destroy();
            this.bullets.remove(bullet, true, true);
          } else {
            onHit(bullet, sprite);
            bullet.destroy();
            this.bullets.remove(bullet, true, true);
          }
          break;
        }
      }

      // ── Supplementary barricade check (tünelleme güvenlik ağı) ───────────
      // Fizik collider ince gövdeyi kaçırdıysa manuel AABB ile yakala
      if (!bullet.active) continue;
      if (!bullet._isHarpoon && this.scene.barricadeSystem) {
        for (const b of this.scene.barricadeSystem.activeBarricades) {
          if (!b.image?.active) continue;
          if (Math.abs(bullet.x - b.x) < b.bWidth / 2 + 5 &&
              Math.abs(bullet.y - b.y) < b.bHeight / 2 + 5) {
            if (bullet._isMissile) {
              this._explodeMissile(bullet);
            } else {
              b.takeDamage(bullet._weaponId ?? 'bullet_default');
            }
            bullet.destroy();
            this.bullets.remove(bullet, true, true);
            break;
          }
        }
      }
    }
  }

  isHarpoonActive() {
    return this._activeHarpoon !== null;
  }

  isHarpoonPulling() {
    return this._activeHarpoon?.phase === 'pulling';
  }

  // Legacy getter kept for compatibility
  getAmmoState() {
    return { current: 0, max: 0 };
  }
}
