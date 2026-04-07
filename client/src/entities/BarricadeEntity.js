// wildzone/client/src/entities/BarricadeEntity.js
import { BARRICADE } from '../constants/barricades.js';

export default class BarricadeEntity {
  constructor(scene, x, y, orientation, materialKey = 'wood') {
    this.scene        = scene;
    this.barricadeId  = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.orientation  = orientation;
    this.materialKey  = materialKey;
    this.supportPropId = null;

    const mat = BARRICADE.materials[materialKey];

    this.bWidth  = orientation === 'horizontal' ? BARRICADE.length    : BARRICADE.thickness;
    this.bHeight = orientation === 'horizontal' ? BARRICADE.thickness : BARRICADE.length;

    this.maxHP     = mat.maxHP;
    this.currentHP = mat.maxHP;

    this.image = scene.add.rectangle(x, y, this.bWidth, this.bHeight, mat.colors.full)
      .setDepth(2);

    scene.physics.add.existing(this.image, true);
    // Physics body görsel boyutuyla eşleşsin: oyuncu sığabilsin.
    // Mermi tünelleme koruması WeaponSystem'deki manuel AABB kontrolüyle sağlanıyor.
    this.image.body.setSize(this.bWidth, this.bHeight);
    // setSize() sonrası reset() zorunlu: spatial hash'i günceller
    this.image.body.reset(x, y);

    this.image._barricadeRef = this;
  }

  get x() { return this.image.x; }
  get y() { return this.image.y; }

  takeDamage(weaponId, multiplier = 1) {
    if (!this.image.active || this.currentHP <= 0) return;

    const baseDmg = BARRICADE.damage[weaponId] ?? BARRICADE.damage.bullet_default;
    const dmg = Math.round(baseDmg * multiplier);
    this.currentHP = Math.max(0, this.currentHP - dmg);
    this.updateVisualState();

    if (this.currentHP > 0 && this.currentHP <= this.maxHP * 0.25) {
      this.playShakeAnimation();
    }

    if (this.currentHP === 0) this.onDestroy();
  }

  updateVisualState() {
    const ratio  = this.currentHP / this.maxHP;
    const colors = BARRICADE.materials[this.materialKey].colors;
    const alphas = BARRICADE.alphas;

    let color, alpha;
    if (ratio > 0.75)      { color = colors.full;     alpha = alphas.full;     }
    else if (ratio > 0.5)  { color = colors.damaged1; alpha = alphas.damaged1; }
    else if (ratio > 0.25) { color = colors.damaged2; alpha = alphas.damaged2; }
    else                   { color = colors.critical; alpha = alphas.critical; }

    this.image.setFillStyle(color).setAlpha(alpha);
  }

  playShakeAnimation() {
    if (this._shaking) return;
    this._shaking = true;
    const ox = this.image.x, oy = this.image.y;
    this.scene.tweens.add({
      targets: this.image, x: ox + 3, duration: 40, yoyo: true, repeat: 2,
      onComplete: () => { this.image.setPosition(ox, oy); this._shaking = false; }
    });
  }

  onDestroy() {
    this._playDestroyEffect();

    if (this.image.body) {
      this.scene.physics.world.remove(this.image.body);
    }
    this.image.setActive(false).setVisible(false);
    this.scene.barricadeSystem?.removeBarricade(this.barricadeId);
  }

  _playDestroyEffect() {
    const { x, y } = this.image;
    const col = BARRICADE.materials[this.materialKey].colors.critical;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist  = 16 + Math.random() * 16;
      const p = this.scene.add.rectangle(x, y, 4 + Math.random() * 4, 4 + Math.random() * 4, col)
        .setDepth(3);
      this.scene.tweens.add({
        targets: p, x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 300 + Math.random() * 200,
        onComplete: () => p.destroy()
      });
    }
  }
}
