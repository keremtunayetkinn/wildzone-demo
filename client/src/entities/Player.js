// wildzone/client/src/entities/Player.js
import CONSTANTS from '../constants.js';
import InventorySystem from '../systems/InventorySystem.js';
import ArmorSystem from '../systems/ArmorSystem.js';
import ResourceSystem from '../systems/ResourceSystem.js';

export default class Player {
  constructor(scene, x, y, character, accessory, username) {
    this.scene = scene;
    this.hp = CONSTANTS.PLAYER_HP;
    this.alive = true;
    this.socketId = null;

    // Phase 2 systems
    this.inventory = new InventorySystem();
    this.armorSystem = new ArmorSystem();

    // Phase 3
    this.resources = new ResourceSystem();

    // Stamina
    this.stamina    = 100;
    this.maxStamina = 100;

    // Regen tracking
    this._lastDamageTime = 0;

    // Camouflage state
    this.isCamouflaged = false;
    this._camoSprite = null;

    // Main sprite
    this.sprite = scene.physics.add.image(x, y, character).setDisplaySize(40, 40);
    this.sprite.body.setSize(40, 40);
    this.sprite.setCollideWorldBounds(false);
    this.sprite.setDepth(2);

    // Accessory overlay
    this.accSprite = null;
    if (accessory) {
      this.accSprite = scene.add.image(x, y - 20, accessory).setDisplaySize(32, 32).setDepth(3);
    }

    // Username label
    this.nameLabel = scene.add.text(x, y - 46, username || '', {
      fontSize: '11px', fill: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(4);

    // Armor bar (above HP bar, hidden when no armor)
    this.armorBarBg = scene.add.rectangle(x, y - 38, 50, 3, 0x222222).setOrigin(0.5, 0.5).setDepth(4).setVisible(false);
    this.armorBar   = scene.add.rectangle(x - 25, y - 38, 50, 3, 0x4169E1).setOrigin(0, 0.5).setDepth(5).setVisible(false);

    // HP bar (above sprite)
    this.hpBarBg = scene.add.rectangle(x, y - 32, 50, 5, 0x222222).setOrigin(0.5, 0.5).setDepth(4);
    this.hpBar   = scene.add.rectangle(x - 25, y - 32, 50, 5, 0x4caf50).setOrigin(0, 0.5).setDepth(5);
  }

  update(rotation) {
    if (!this.alive) return;
    const { x, y } = this.sprite;
    this.sprite.setRotation(rotation);

    if (this.accSprite) this.accSprite.setPosition(x, y - 20).setRotation(rotation);
    this.nameLabel.setPosition(x, y - 46);
    this.armorBarBg.setPosition(x, y - 38);
    this.armorBar.setPosition(x - 25, y - 38);
    this.hpBarBg.setPosition(x, y - 32);
    this.hpBar.setPosition(x - 25, y - 32);

    if (this._camoSprite) this._camoSprite.setPosition(x, y);

    this._updateHPBarColor();
  }

  setHP(hp) {
    const newHp = Math.max(0, hp);
    if (newHp < this.hp) this._lastDamageTime = Date.now();
    this.hp = newHp;
    const pct = this.hp / CONSTANTS.PLAYER_HP;
    this.hpBar.setDisplaySize(50 * pct, 5);
    this._updateHPBarColor();
  }

  updateArmorDisplay() {
    const as = this.armorSystem;
    if (!as || !as.isEquipped()) {
      this.armorBarBg.setVisible(false);
      this.armorBar.setVisible(false);
      return;
    }
    const pct = as.getDurabilityPercent();
    const color = as.getArmorColor() || 0x4169E1;
    this.armorBarBg.setVisible(true);
    this.armorBar.setVisible(true).setDisplaySize(50 * pct, 3).setFillStyle(color);
  }

  // Phase 2: apply damage through armor system
  takeDamage(rawDamage, isMelee = false) {
    const net = this.armorSystem.applyDamage(rawDamage, isMelee);
    this.setHP(this.hp - net);
    return net;
  }

  // ---- Camouflage ----

  activateCamouflage() {
    if (this.isCamouflaged) return;
    this.isCamouflaged = true;

    // Show camo bush sprite over player
    if (!this._camoSprite) {
      this._camoSprite = this.scene.add.image(
        this.sprite.x, this.sprite.y, 'bush_camo'
      ).setDisplaySize(40, 40).setDepth(2.5);
    }
    this._camoSprite.setVisible(true);
    this.sprite.setAlpha(0);
    if (this.accSprite) this.accSprite.setAlpha(0);
    this.nameLabel.setAlpha(0);
  }

  deactivateCamouflage() {
    if (!this.isCamouflaged) return;
    this.isCamouflaged = false;

    this.sprite.setAlpha(1);
    if (this.accSprite) this.accSprite.setAlpha(1);
    this.nameLabel.setAlpha(1);

    if (this._camoSprite) this._camoSprite.setVisible(false);
  }

  // Call every frame when camouflaged; speed in px/s
  updateCamouflage(speed) {
    if (!this.isCamouflaged) return;

    if (speed === 0) {
      // Fully invisible
      if (this._camoSprite) this._camoSprite.setAlpha(1);
      this.sprite.setAlpha(0);
    } else if (speed <= 80) {
      // Half visible
      if (this._camoSprite) this._camoSprite.setAlpha(0.8);
      this.sprite.setAlpha(0.5);
      if (this.accSprite) this.accSprite.setAlpha(0.5);
    } else if (speed <= 150) {
      // Mostly visible
      if (this._camoSprite) this._camoSprite.setAlpha(0.5);
      this.sprite.setAlpha(0.8);
      if (this.accSprite) this.accSprite.setAlpha(0.8);
    } else {
      // Too fast — camouflage breaks
      this.deactivateCamouflage();
      this._shakeCamoBush();
    }
  }

  _shakeCamoBush() {
    if (!this._camoSprite) return;
    this._camoSprite.setVisible(true);
    this.scene.tweens.add({
      targets: this._camoSprite,
      x: this.sprite.x + 4,
      duration: 60,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        if (this._camoSprite) this._camoSprite.setVisible(false);
      }
    });
  }

  // ---- Death ----

  die() {
    this.alive = false;
    this.deactivateCamouflage();
    this.sprite.setTint(0x666666);
    this.scene.tweens.add({
      targets: [this.sprite, this.accSprite, this.nameLabel, this.hpBar, this.hpBarBg, this.armorBar, this.armorBarBg, this._camoSprite].filter(Boolean),
      alpha: 0,
      duration: 1500,
      onComplete: () => this.destroy()
    });
  }

  destroy() {
    [this.sprite, this.accSprite, this.nameLabel, this.hpBar, this.hpBarBg, this.armorBar, this.armorBarBg, this._camoSprite]
      .filter(Boolean)
      .forEach(obj => obj.destroy());
  }

  _updateHPBarColor() {
    const pct = this.hp / CONSTANTS.PLAYER_HP;
    if (pct > 0.5)       this.hpBar.setFillStyle(0x4caf50);
    else if (pct > 0.25) this.hpBar.setFillStyle(0xffeb3b);
    else                 this.hpBar.setFillStyle(0xf44336);
  }
}
