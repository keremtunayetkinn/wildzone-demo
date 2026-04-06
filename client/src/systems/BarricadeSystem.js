// wildzone/client/src/systems/BarricadeSystem.js
import { BARRICADE } from '../constants/barricades.js';
import BarricadeEntity from '../entities/BarricadeEntity.js';

const MAP_EDGE_MARGIN = 150;

export default class BarricadeSystem {
  constructor(scene, player) {
    this.scene  = scene;
    this.player = player;

    this.activeBarricades = [];

    // Materyal seçimi
    this._materialKeys = Object.keys(BARRICADE.materials); // ['wood','stone','metal']
    this._materialIdx  = 0;

    // Mermi çarpışması için staticGroup
    this._group = scene.physics.add.staticGroup();

    // Önizleme dikdörtgeni
    this._preview = scene.add.rectangle(0, 0, BARRICADE.length, BARRICADE.thickness, 0x00ff00, 0.4)
      .setDepth(5)
      .setVisible(false);
  }

  // ─── Materyal ─────────────────────────────────────────────────────────────

  get _currentMaterial() {
    return BARRICADE.materials[this._materialKeys[this._materialIdx]];
  }

  get _currentMaterialKey() {
    return this._materialKeys[this._materialIdx];
  }

  cycleMaterial() {
    this._materialIdx = (this._materialIdx + 1) % this._materialKeys.length;
    this.scene.events.emit('build_material_cycled', {
      key:   this._currentMaterialKey,
      label: this._currentMaterial.label,
    });
  }

  // ─── Yerleştirme ─────────────────────────────────────────────────────────

  updatePreview() {
    const snap = this._snapToGridEdge();
    if (!snap) { this._preview.setVisible(false); return; }

    const { x, y, orientation } = snap;
    const w = orientation === 'horizontal' ? BARRICADE.length    : BARRICADE.thickness;
    const h = orientation === 'horizontal' ? BARRICADE.thickness : BARRICADE.length;

    this._preview.setSize(w, h).setPosition(x, y).setVisible(true);

    const mat       = this._currentMaterial;
    const valid     = this._isValidPlacement(x, y, snap.supportProp);
    const affordable = this.player.resources?.canAfford(mat.cost.type, mat.cost.amount);
    this._preview.setFillStyle(valid && affordable ? mat.preview : 0xff2200, 0.5);
  }

  hidePreview() {
    this._preview.setVisible(false);
  }

  tryPlace() {
    const snap = this._snapToGridEdge();
    if (!snap) return;

    const { x, y, orientation, supportProp } = snap;
    const mat = this._currentMaterial;

    if (!this._isValidPlacement(x, y, supportProp)) return;

    if (!this.player.resources?.canAfford(mat.cost.type, mat.cost.amount)) {
      this.scene.events.emit('barricade_no_resources', mat.cost.type);
      return;
    }

    if (this.activeBarricades.length >= BARRICADE.maxActive) {
      this.activeBarricades[0].onDestroy();
    }

    const barricade = new BarricadeEntity(this.scene, x, y, orientation, this._currentMaterialKey);
    barricade.supportPropId = supportProp?.propId ?? null;

    this.activeBarricades.push(barricade);
    this._group.add(barricade.image);
    this._group.refresh(); // spatial hash'i güncelle

    this.player.resources.spend(mat.cost.type, mat.cost.amount);
    this.scene.events.emit('resource_changed', this.player.resources.getAll());
    this.scene.events.emit('barricade_count_changed', this.activeBarricades.length);
  }

  // ─── Kayıt temizleme ──────────────────────────────────────────────────────

  removeBarricade(barricadeId) {
    const idx = this.activeBarricades.findIndex(b => b.barricadeId === barricadeId);
    if (idx === -1) return;
    const [b] = this.activeBarricades.splice(idx, 1);
    this._group.remove(b.image, false, false);
    this._group.refresh(); // kaldırılan body'yi spatial hash'ten temizle
    this.scene.events.emit('barricade_count_changed', this.activeBarricades.length);
  }

  onSupportDestroyed(propId) {
    for (const b of [...this.activeBarricades]) {
      if (b.supportPropId === propId) b.onDestroy();
    }
  }

  getBarricadeGroup() {
    return this._group;
  }

  // ─── Snap hesabı ──────────────────────────────────────────────────────────

  _snapToGridEdge() {
    if (!this.scene.player) return null;
    const T  = BARRICADE.tileSize;
    const px = this.scene.player.sprite.x;
    const py = this.scene.player.sprite.y;

    const cam = this.scene.cameras.main;
    const ptr = this.scene.input.activePointer;
    const cx  = ptr.x + cam.scrollX;
    const cy  = ptr.y + cam.scrollY;

    // İmlece en yakın dikey ve yatay ızgara çizgilerini bul
    const nearVX = Math.round(cx / T) * T;
    const nearHY = Math.round(cy / T) * T;
    const distV  = Math.abs(cx - nearVX);
    const distH  = Math.abs(cy - nearHY);

    let x, y, orientation;

    if (distV <= distH) {
      // Dikey ızgara çizgisine daha yakın → dikey barikat
      orientation = 'vertical';
      x = nearVX;
      y = (Math.floor(cy / T) + 0.5) * T;  // imlecin bulunduğu tile'ın merkezi
    } else {
      // Yatay ızgara çizgisine daha yakın → yatay barikat
      orientation = 'horizontal';
      y = nearHY;
      x = (Math.floor(cx / T) + 0.5) * T;  // imlecin bulunduğu tile'ın merkezi
    }

    // Menzil kontrolü: snap noktası oyuncudan 1.5 tile'dan fazla uzaksa iptal
    if (Math.hypot(x - px, y - py) > 1.5 * T) return null;

    const supportProp = this._findSupportProp(x, y, orientation);
    return { x, y, orientation, supportProp };
  }

  _findSupportProp(snapX, snapY, orientation) {
    const props   = this.scene.propSystem?.props ?? [];
    const T       = BARRICADE.tileSize;
    const halfLen = BARRICADE.length / 2;
    const tol     = T / 2;

    return props.find(prop => {
      if (!prop.active) return false;
      if (orientation === 'horizontal') {
        return Math.abs(prop.y - snapY) < tol && Math.abs(prop.x - snapX) < halfLen;
      } else {
        return Math.abs(prop.x - snapX) < tol && Math.abs(prop.y - snapY) < halfLen;
      }
    }) ?? null;
  }

  // ─── Yerleştirme geçerliliği ──────────────────────────────────────────────

  _isValidPlacement(x, y, supportProp) {
    const MAP_W = this.scene.physics.world.bounds.width;
    const MAP_H = this.scene.physics.world.bounds.height;

    if (x < MAP_EDGE_MARGIN || x > MAP_W - MAP_EDGE_MARGIN) return false;
    if (y < MAP_EDGE_MARGIN || y > MAP_H - MAP_EDGE_MARGIN) return false;

    const CLEAR = 20;
    for (const b of this.activeBarricades) {
      if (Math.abs(b.x - x) < CLEAR && Math.abs(b.y - y) < CLEAR) return false;
    }

    if (!supportProp) {
      const props   = this.scene.propSystem?.props ?? [];
      const halfLen = BARRICADE.length / 2;
      const halfThk = BARRICADE.thickness / 2;
      for (const prop of props) {
        if (!prop.active) continue;
        if (Math.abs(prop.x - x) < halfLen && Math.abs(prop.y - y) < halfThk + 10) return false;
      }
    }

    return true;
  }
}
