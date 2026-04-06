// wildzone/client/src/systems/PropSystem.js
import PropEntity from '../entities/PropEntity.js';
import CONSTANTS from '../constants.js';

// Harita sabit seed'i (GameScene'deki ile aynı)
const SEED = 'wildzone_seed';

// Minimum mesafeler
const MIN_PROP_PROP   = 40;
const MIN_PROP_SPAWN  = 200;

export default class PropSystem {
  constructor(scene) {
    this.scene  = scene;
    // Tüm canlı PropEntity nesneleri (MeleeSystem ve BarricadeSystem erişim için)
    this.props  = [];
    // Mermi + oyuncu çarpışması için tek staticGroup
    this._group = scene.physics.add.staticGroup();
  }

  // GameScene._buildMap() bu metodu çağırır (eski tree/rock/bush spawn'u yerini alır)
  spawnProps() {
    const rng = new Phaser.Math.RandomDataGenerator([SEED]);
    const W   = CONSTANTS.MAP_WIDTH;
    const H   = CONSTANTS.MAP_HEIGHT;

    this._spawnType('tree',        110, rng, W, H, 60);
    this._spawnType('rock',         32, rng, W, H, 40);
    this._spawnType('bush_prop',    80, rng, W, H, 20);
    this._spawnType('metal_crate',  20, rng, W, H, 40);
  }

  _spawnType(propType, count, rng, W, H, margin) {
    let placed = 0;
    let tries  = 0;
    const maxTries = count * 20;

    while (placed < count && tries < maxTries) {
      tries++;
      const x = rng.integerInRange(margin, W - margin);
      const y = rng.integerInRange(margin, H - margin);

      if (!this._isClearPosition(x, y)) continue;

      const prop = new PropEntity(this.scene, x, y, propType);
      this.props.push(prop);
      // Fizik imgesini gruba ekle (static collider olarak kullanılır)
      this._group.add(prop.image);
      placed++;
    }
  }

  _isClearPosition(x, y) {
    // Diğer prop'lardan MIN_PROP_PROP px uzak olmalı
    for (const p of this.props) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy < MIN_PROP_PROP * MIN_PROP_PROP) return false;
    }
    return true;
  }

  // WeaponSystem.addCollider() ve player collider için tek grup
  getColliderGroup() {
    return this._group;
  }

  // MeleeSystem detectHits için: verilen noktanın yakınındaki aktif prop'ları döndürür
  getPropsNear(x, y, radius) {
    const r2 = radius * radius;
    return this.props.filter(p => {
      if (!p.active) return false;
      const dx = p.x - x;
      const dy = p.y - y;
      return dx * dx + dy * dy <= r2;
    });
  }

  // Sahne kapanınca çağrılır: respawn zamanlayıcılarını temizle (hafıza sızıntısı önler)
  clearAllRespawnTimers() {
    for (const p of this.props) {
      p.clearRespawnTimer();
    }
  }
}
