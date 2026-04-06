import CONSTANTS from '../constants.js';

const LERP = 0.2;

export default class RemotePlayer {
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.socketId = data.socketId;
    this.hp = data.hp || CONSTANTS.PLAYER_HP;
    this.alive = true;

    this.targetX = data.x;
    this.targetY = data.y;
    this.targetRotation = data.rotation || 0;

    // Sprite
    this.sprite = scene.add.image(data.x, data.y, data.character || 'char_1')
      .setDisplaySize(40, 40).setDepth(2);

    // Accessory
    this.accSprite = null;
    if (data.accessory) {
      this.accSprite = scene.add.image(data.x, data.y - 20, data.accessory)
        .setDisplaySize(32, 32).setDepth(3);
    }

    // Username label
    this.nameLabel = scene.add.text(data.x, data.y - 38, data.username || '', {
      fontSize: '11px', fill: '#ffcccc', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(4);

    // HP bar
    this.hpBarBg = scene.add.rectangle(data.x, data.y + 30, 44, 6, 0x333333).setDepth(4);
    this.hpBar   = scene.add.rectangle(data.x - 22, data.y + 30, 44, 6, 0x4caf50).setOrigin(0, 0.5).setDepth(5);
  }

  setTarget(x, y, rotation) {
    this.targetX = x;
    this.targetY = y;
    this.targetRotation = rotation;
  }

  update() {
    if (!this.alive) return;

    // Lerp position
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, LERP);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, LERP);
    this.sprite.rotation = Phaser.Math.Angle.RotateTo(this.sprite.rotation, this.targetRotation, 0.2);

    const { x, y } = this.sprite;
    if (this.accSprite) this.accSprite.setPosition(x, y - 20).setRotation(this.sprite.rotation);
    this.nameLabel.setPosition(x, y - 38);
    this.hpBarBg.setPosition(x, y + 30);
    this.hpBar.setPosition(x - 22, y + 30);
  }

  setHP(hp) {
    this.hp = Math.max(0, hp);
    const pct = this.hp / CONSTANTS.PLAYER_HP;
    this.hpBar.setDisplaySize(44 * pct, 6);
    if (pct > 0.5) this.hpBar.setFillStyle(0x4caf50);
    else if (pct > 0.25) this.hpBar.setFillStyle(0xffeb3b);
    else this.hpBar.setFillStyle(0xf44336);
  }

  die() {
    this.alive = false;
    this.scene.tweens.add({
      targets: [this.sprite, this.accSprite, this.nameLabel, this.hpBar, this.hpBarBg].filter(Boolean),
      alpha: 0,
      duration: 1500,
      onComplete: () => this.destroy()
    });
  }

  destroy() {
    [this.sprite, this.accSprite, this.nameLabel, this.hpBar, this.hpBarBg]
      .filter(Boolean)
      .forEach(obj => obj.destroy());
  }
}
