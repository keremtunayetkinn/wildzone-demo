// wildzone/client/src/entities/LootDrop.js

const WEAPON_COLORS = {
  pistol: 0xaaaaaa,
  shotgun: 0xff6600,
  smg: 0x00aaff,
  sniper: 0xaa00ff,
  bazooka: 0xff2200,
  bush: 0x33aa33,
};

// Yakın dövüş silahları için elde tutulan görselle aynı tanımlar
const MELEE_VISUALS = {
  sword:   { handleColor: 0x8B6914, handleLen: 8,  handleW: 3, headColor: 0xCCCCDD, headLen: 30, headW: 4  },
  pickaxe: { handleColor: 0x8B6914, handleLen: 22, handleW: 4, headColor: 0x4682B4, headLen: 14, headW: 5  },
  axe:     { handleColor: 0x8B6914, handleLen: 20, handleW: 4, headColor: 0xAAAAAA, headLen: 10, headW: 12 },
};

const ARMOR_COLORS = {
  armor_1: 0x4169E1,
  armor_2: 0x8B008B,
  armor_3: 0xFFD700
};

const AMMO_COLORS = {
  ammo_pistol: 0xFFD700,
  ammo_shotgun: 0xFF4500,
  ammo_smg: 0x00BFFF,
  ammo_sniper: 0x9400D3,
  ammo_bazooka: 0xFF6347
};

export default class LootDrop extends Phaser.GameObjects.Container {
  constructor(scene, x, y, itemData) {
    super(scene, x, y);
    scene.add.existing(this);

    this.itemData = itemData; // { type, id, quantity, rarity }
    this._baseY = y;

    this._createVisual();
    this._startFloatAnimation();
    this.applyRarityGlow();
  }

  _createVisual() {
    const { type, id, quantity } = this.itemData;

    // Yakın dövüş silahları: elde tutulan görselle aynı sap+uç şekli
    if (type === 'melee') {
      const vis = MELEE_VISUALS[id];
      if (vis) {
        const totalW = vis.handleLen + vis.headLen;
        const offsetX = -totalW / 2;
        const g = this.scene.add.graphics();
        g.fillStyle(vis.handleColor, 0.9);
        g.fillRect(offsetX, -vis.handleW / 2, vis.handleLen, vis.handleW);
        g.fillStyle(vis.headColor, 0.95);
        g.fillRect(offsetX + vis.handleLen, -vis.headW / 2, vis.headLen, vis.headW);
        this.icon = g;
        this.add(g);

        if (quantity && quantity > 1) {
          const lbl = this.scene.add.text(0, 12, `x${quantity}`, {
            fontSize: '7px', fill: '#ffffff', fontFamily: 'monospace'
          }).setOrigin(0.5);
          this.add(lbl);
        }
        return;
      }
    }

    let color, w, h;
    if (type === 'weapon' || type === 'utility') {
      color = WEAPON_COLORS[id] || 0xffffff;
      w = 20; h = 10;
    } else if (type === 'ammo') {
      color = AMMO_COLORS[id] || 0xFFD700;
      w = 10; h = 10;
    } else if (type === 'armor') {
      color = ARMOR_COLORS[id] || 0xaaaaaa;
      w = 16; h = 18;
    } else {
      color = 0xffffff;
      w = 12; h = 12;
    }

    this.icon = this.scene.add.rectangle(0, 0, w, h, color);
    this.add(this.icon);

    // Quantity label for ammo
    if (quantity && quantity > 1) {
      const lbl = this.scene.add.text(0, 12, `x${quantity}`, {
        fontSize: '7px', fill: '#ffffff', fontFamily: 'monospace'
      }).setOrigin(0.5);
      this.add(lbl);
    }
  }

  _startFloatAnimation() {
    this.scene.tweens.add({
      targets: this,
      y: this._baseY - 5,
      duration: 1000 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  applyRarityGlow() {
    const rarity = this.itemData.rarity;
    if (rarity === 'rare') {
      this.scene.tweens.add({
        targets: this.icon,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else if (rarity === 'uncommon') {
      this.scene.tweens.add({
        targets: this.icon,
        alpha: 0.6,
        duration: 900,
        yoyo: true,
        repeat: -1
      });
    }
    // common: no effect
  }

  onPlayerNearby(isNear) {
    // Pulse when player is nearby
    if (isNear) {
      this.scene.tweens.add({
        targets: this.icon,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 200,
        yoyo: true,
        repeat: 1
      });
    }
  }

  destroy() {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.icon);
    super.destroy(true);
  }
}
