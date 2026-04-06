// wildzone/client/src/entities/PropEntity.js
import { PROPS } from '../constants/props.js';

export default class PropEntity {
  constructor(scene, x, y, propType) {
    this.scene      = scene;
    this.propType   = propType;
    this.propId     = `prop_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const def       = PROPS[propType];
    this.maxHP      = def.maxHP;
    this.currentHP  = def.maxHP;
    this.respawnTime = def.respawnTime;
    this._spawnX    = x;
    this._spawnY    = y;
    this._respawnTimer = null;

    // Fizik destekli imge
    this.image = scene.add.image(x, y, def.key)
      .setDisplaySize(def.displayWidth, def.displayHeight)
      .setDepth(def.depth);
    scene.physics.add.existing(this.image, true); // true = static

    if (def.colliderType === 'circle') {
      this.image.body.setCircle(
        def.colliderRadius,
        def.colliderOffsetX,
        def.colliderOffsetY
      );
    } else {
      this.image.body.setSize(def.colliderWidth, def.colliderHeight);
    }
  }

  get x() { return this.image.x; }
  get y() { return this.image.y; }
  get active() { return this.image.active; }

  takeDamage(amount) {
    if (!this.image.active || this.currentHP <= 0) return;
    this.currentHP = Math.max(0, this.currentHP - amount);
    this.updateVisualState();
    if (this.currentHP === 0) this.onDestroy();
  }

  updateVisualState() {
    const ratio = this.currentHP / this.maxHP;
    if (ratio > 0.75) {
      this.image.clearTint().setAlpha(1.0);
    } else if (ratio > 0.5) {
      this.image.setTint(0xddbb88).setAlpha(0.9);
    } else if (ratio > 0.25) {
      this.image.setTint(0xbb6622).setAlpha(0.8);
    } else {
      this.image.setTint(0x883300).setAlpha(0.65);
    }
  }

  onDestroy() {
    // Barikat tek yönlü bağımlılık: engel yıkılınca desteklediği barikatlar da yıkılır
    this.scene.barricadeSystem?.onSupportDestroyed(this.propId);

    this._playDestroyEffect();

    // Fizik vücudunu devre dışı bırak (görünmez engel önlenir)
    if (this.image.body) {
      this.image.body.enable = false;
    }
    this.image.setActive(false).setVisible(false);

    // Respawn zamanlayıcısı (null = respawn yok)
    if (this.respawnTime !== null) {
      this._respawnTimer = this.scene.time.delayedCall(
        this.respawnTime,
        () => this.respawn()
      );
    }
  }

  respawn() {
    this._respawnTimer = null;
    this.currentHP = this.maxHP;
    this.image
      .setActive(true)
      .setVisible(true)
      .clearTint()
      .setAlpha(1.0);
    if (this.image.body) {
      this.image.body.reset(this._spawnX, this._spawnY);
      this.image.body.enable = true;
    }
  }

  clearRespawnTimer() {
    if (this._respawnTimer) {
      this._respawnTimer.remove(false);
      this._respawnTimer = null;
    }
  }

  _playDestroyEffect() {
    const { x, y } = this.image;
    const color = this.propType === 'rock' ? 0x78909c : 0x6d4c41;
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const dist  = 20 + Math.random() * 20;
      const p = this.scene.add.circle(x, y, 3 + Math.random() * 3, color).setDepth(3);
      this.scene.tweens.add({
        targets:  p,
        x:        x + Math.cos(angle) * dist,
        y:        y + Math.sin(angle) * dist,
        alpha:    0,
        scaleX:   0,
        scaleY:   0,
        duration: 280 + Math.random() * 200,
        onComplete: () => p.destroy()
      });
    }
  }
}
