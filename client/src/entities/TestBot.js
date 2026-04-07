// TestBot — deneme botu: oyuncuyu hedef alır, barikat/prop ile etkileşir
import { WEAPONS } from '../constants/weapons.js';

const BOT_HP        = 100;
const FIRE_INTERVAL = 800;   // ms
const BULLET_SPEED  = WEAPONS.pistol.bulletSpeed;
const BULLET_COLOR  = 0xff4444;
const BULLET_RANGE  = WEAPONS.pistol.range;

export default class TestBot {
  constructor(scene, x, y, onDied = null) {
    this.scene   = scene;
    this.hp      = BOT_HP;
    this.alive   = true;
    this._fireTimer = 0;
    this._onDied = onDied;
    this._lastDamageTime = 0;

    // Sprite
    this.sprite = scene.add.image(x, y, 'char_1')
      .setDisplaySize(40, 40).setDepth(2).setTint(0xff8888);
    scene.physics.add.existing(this.sprite, true); // static body
    this.sprite.body.setSize(40, 40);

    // İsim
    this.nameLabel = scene.add.text(x, y - 46, 'TEST BOT', {
      fontSize: '10px', fill: '#ff4444', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(4);

    // HP bar
    this.hpBarBg = scene.add.rectangle(x, y - 38, 50, 5, 0x333333).setDepth(4);
    this.hpBar   = scene.add.rectangle(x - 25, y - 38, 50, 5, 0x4caf50).setOrigin(0, 0.5).setDepth(5);

    // Aktif mermi listesi (temizlik için)
    this._bullets = [];
  }

  _fireBullet() {
    if (!this.alive) return;
    const { x, y } = this.sprite;

    // En yakın hedefe doğru açı
    const target = this._getNearestTarget();
    if (!target) return;
    const angle = Phaser.Math.Angle.Between(x, y, target.sprite.x, target.sprite.y);

    const bullet = this.scene.add.rectangle(x + 24, y, 7, 4, BULLET_COLOR)
      .setDepth(2).setRotation(angle);

    this.scene.physics.add.existing(bullet);
    bullet.body.setAllowGravity(false);
    bullet.body.setVelocity(
      Math.cos(angle) * BULLET_SPEED,
      Math.sin(angle) * BULLET_SPEED
    );
    bullet._spawnX = x;
    bullet._spawnY = y;
    this._bullets.push(bullet);

    const destroyBullet = () => {
      if (!bullet.active) return;
      bullet.destroy();
      const idx = this._bullets.indexOf(bullet);
      if (idx !== -1) this._bullets.splice(idx, 1);
    };

    // ── Menzil kontrolü ─────────────────────────────────────────────────────
    const checkRange = this.scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        if (!bullet.active) { checkRange.destroy(); return; }
        const dx = bullet.x - bullet._spawnX;
        const dy = bullet.y - bullet._spawnY;
        if (dx * dx + dy * dy > BULLET_RANGE * BULLET_RANGE) {
          destroyBullet();
          checkRange.destroy();
        }
      }
    });

    // ── Barikat çarpışması ───────────────────────────────────────────────────
    if (this.scene.barricadeSystem) {
      this.scene.physics.add.collider(
        bullet,
        this.scene.barricadeSystem.getBarricadeGroup(),
        (_b, barricadeImg) => {
          barricadeImg._barricadeRef?.takeDamage('pistol');
          destroyBullet();
          checkRange.destroy();
        }
      );
    }

    // ── Prop çarpışması (mermi geçemez, hasar vermez) ────────────────────────
    if (this.scene.propSystem) {
      this.scene.physics.add.collider(
        bullet,
        this.scene.propSystem.getColliderGroup(),
        () => {
          destroyBullet();
          checkRange.destroy();
        }
      );
    }

    // ── Oyuncuya çarpma ──────────────────────────────────────────────────────
    if (this.scene.player?.alive) {
      this.scene.physics.add.overlap(bullet, this.scene.player.sprite, () => {
        if (!bullet.active) return;
        destroyBullet();
        checkRange.destroy();
        this.scene.cameras.main.shake(80, 0.005);
        const player = this.scene.player;
        player.takeDamage(WEAPONS.pistol.damage);
        player.updateArmorDisplay();
        this.scene.events.emit('inventory_changed');

        // Camouflage check: deactivate if bush armor broke, reveal temporarily if still active
        if (player.isCamouflaged) {
          const bushGone = !player.armorSystem.currentArmor || player.armorSystem.currentArmor.id !== 'bush';
          if (bushGone) {
            player.deactivateCamouflage();
          } else {
            player.revealCamoInfo();
          }
        }

        if (player.hp <= 0) this.scene._handleLocalDeath();
      });
    }

    // ── Diğer botlara çarpma ─────────────────────────────────────────────────
    for (const otherBot of this.scene.testBots ?? []) {
      if (otherBot === this || !otherBot.alive) continue;
      this.scene.physics.add.overlap(bullet, otherBot.sprite, () => {
        if (!bullet.active || !otherBot.alive) return;
        destroyBullet();
        checkRange.destroy();
        otherBot.setHP(otherBot.hp - WEAPONS.pistol.damage);
      });
    }
  }

  setHP(hp) {
    const newHp = Math.max(0, hp);
    if (newHp < this.hp) this._lastDamageTime = Date.now();
    this.hp = newHp;
    const pct = this.hp / BOT_HP;
    this.hpBar.setDisplaySize(50 * pct, 5);
    if (pct > 0.5)       this.hpBar.setFillStyle(0x4caf50);
    else if (pct > 0.25) this.hpBar.setFillStyle(0xffeb3b);
    else                 this.hpBar.setFillStyle(0xf44336);

    if (this.hp <= 0) this._die();
  }

  _die() {
    this.alive = false;
    // Kalan mervileri temizle
    for (const b of this._bullets) { if (b.active) b.destroy(); }
    this._bullets = [];

    // Drop loot: pistol + random resources
    this._dropLoot();

    if (this._onDied) this._onDied();
    this.scene.tweens.add({
      targets: [this.sprite, this.nameLabel, this.hpBar, this.hpBarBg],
      alpha: 0, duration: 1000,
      onComplete: () => this.destroy()
    });
  }

  _dropLoot() {
    const ls = this.scene.lootSystem;
    if (!ls) return;
    const { x, y } = this.sprite;
    const offset = () => Phaser.Math.Between(-35, 35);

    // Drop the pistol the bot was using
    ls.createDrop(x + offset(), y + offset(), {
      type: 'weapon', id: 'pistol', quantity: 1,
      rarity: 'common', magazineAmmo: WEAPONS.pistol.magSize,
    });

    // Drop some random resources
    const resTypes = ['wood', 'stone', 'metal'];
    for (const res of resTypes) {
      const amount = Phaser.Math.Between(5, 20);
      ls.createDrop(x + offset(), y + offset(), {
        type: 'resource', id: res, quantity: amount, rarity: 'common',
      });
    }
  }

  _getNearestTarget() {
    const { x, y } = this.sprite;
    let nearest  = null;
    let minDist2 = Infinity;

    if (this.scene.player?.alive) {
      const dx = this.scene.player.sprite.x - x;
      const dy = this.scene.player.sprite.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < minDist2) { minDist2 = d2; nearest = this.scene.player; }
    }

    for (const bot of this.scene.testBots ?? []) {
      if (bot === this || !bot.alive) continue;
      const dx = bot.sprite.x - x;
      const dy = bot.sprite.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < minDist2) { minDist2 = d2; nearest = bot; }
    }

    return nearest;
  }

  update(delta) {
    if (!this.alive) return;

    // UI'yi sprite konumuna senkronize et (zıpkın çekiminde de takip eder)
    const { x, y } = this.sprite;
    this.nameLabel.setPosition(x, y - 46);
    this.hpBarBg.setPosition(x, y - 38);
    this.hpBar.setPosition(x - 25, y - 38);

    // En yakın hedefe bak (oyuncu veya diğer bot)
    const target = this._getNearestTarget();
    if (target) {
      const angle = Phaser.Math.Angle.Between(x, y, target.sprite.x, target.sprite.y);
      this.sprite.setRotation(angle);
    }

    this._fireTimer += delta;
    if (this._fireTimer >= FIRE_INTERVAL) {
      this._fireTimer = 0;
      this._fireBullet();
    }
  }

  destroy() {
    [this.sprite, this.nameLabel, this.hpBar, this.hpBarBg]
      .forEach(o => o?.destroy());
  }
}
