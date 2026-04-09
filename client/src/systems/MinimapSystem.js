// wildzone/client/src/systems/MinimapSystem.js
// Sol ust kosede minimap — oyuncu, zone, diger oyuncular

import CONSTANTS from '../constants.js';
import { ZONE } from '../constants/zone.js';

const MM_SIZE = 160;       // minimap boyutu (px)
const MM_MARGIN = 10;      // ekran kenarından boşluk
const MM_PLAYER_SIZE = 4;  // oyuncu noktası boyutu
const MM_BG_COLOR = 0x2e6b2e;  // orman yeşili
const MM_BORDER_COLOR = 0x3a8a3a;

export default class MinimapSystem {
  constructor(scene, zoneSystem) {
    this.scene = scene;
    this.zone = zoneSystem;

    // Konum: sol üst köşe
    this._x = MM_MARGIN;
    this._y = MM_MARGIN;
    this._size = MM_SIZE;
    this._scale = MM_SIZE / CONSTANTS.MAP_WIDTH; // world → minimap

    // ── Geometry mask: minimap dışına taşan çizimleri kırp ────────────────
    this._maskGfx = scene.add.graphics().setScrollFactor(0);
    this._maskGfx.fillStyle(0xffffff);
    this._maskGfx.fillRect(this._x, this._y, MM_SIZE, MM_SIZE);
    this._maskGfx.setVisible(false);
    this._mask = this._maskGfx.createGeometryMask();

    // ── Arka plan (yeşil, opak) ───────────────────────────────────────────
    this._bg = scene.add.rectangle(this._x, this._y, MM_SIZE, MM_SIZE, MM_BG_COLOR, 1)
      .setOrigin(0, 0).setDepth(300).setScrollFactor(0);

    // ── Sınır ─────────────────────────────────────────────────────────────
    this._border = scene.add.rectangle(this._x, this._y, MM_SIZE, MM_SIZE)
      .setOrigin(0, 0).setDepth(305).setScrollFactor(0)
      .setStrokeStyle(2, MM_BORDER_COLOR).setFillStyle();

    // ── Zone grafikleri (minimap üstüne çizilir, mask ile kırpılır) ──────
    this._zoneGfx = scene.add.graphics().setDepth(302).setScrollFactor(0);
    this._zoneGfx.setMask(this._mask);

    // ── Oyuncu noktaları ──────────────────────────────────────────────────
    this._playerDot = scene.add.rectangle(0, 0, MM_PLAYER_SIZE, MM_PLAYER_SIZE, 0x00ff00)
      .setDepth(304).setScrollFactor(0).setOrigin(0.5);
    this._playerDot.setMask(this._mask);

    // Diğer oyuncular için dot havuzu
    this._otherDots = [];

    // Dirty flag — zone değişince yeniden çiz
    this._lastZoneCX = -1;
    this._lastZoneCY = -1;
    this._lastZoneR  = -1;
    this._lastZoneState = '';
  }

  /** Her frame çağrılır */
  update(player, otherPlayers) {
    this._drawZoneIfDirty();
    this._drawPlayer(player);
    this._drawOtherPlayers(otherPlayers);
  }

  // ── Zone çizimi (sadece değişince) ──────────────────────────────────────

  _drawZoneIfDirty() {
    const cx = this.zone.center.x;
    const cy = this.zone.center.y;
    const r  = this.zone.radius;
    const info = this.zone.getTimerInfo();

    const changed = cx !== this._lastZoneCX || cy !== this._lastZoneCY
      || Math.abs(r - this._lastZoneR) > 0.5 || info.state !== this._lastZoneState;
    if (!changed) return;

    this._lastZoneCX = cx;
    this._lastZoneCY = cy;
    this._lastZoneR  = r;
    this._lastZoneState = info.state;

    const g = this._zoneGfx;
    g.clear();

    const s = this._scale;
    const ox = this._x;
    const oy = this._y;

    // Kırmızı tehlike alanı (tüm minimap — mask ile kare içinde kalır)
    g.fillStyle(ZONE.OVERLAY_COLOR, 0.35);
    g.fillRect(ox, oy, this._size, this._size);

    const mcx = ox + cx * s;
    const mcy = oy + cy * s;
    const mr = r * s;

    // Güvenli alan: yeşil arka plan rengiyle doldur (siyah daire yok)
    g.fillStyle(MM_BG_COLOR, 1);
    g.fillCircle(mcx, mcy, mr);

    // Güvenli alan sınır çizgisi
    g.lineStyle(1.5, 0x44ff44, 0.9);
    g.strokeCircle(mcx, mcy, mr);

    // Hedef alan (shrinking sırasında)
    if (info.state === 'shrinking') {
      const tcx = ox + this.zone.targetCenter.x * s;
      const tcy = oy + this.zone.targetCenter.y * s;
      const tr = this.zone.targetRadius * s;
      g.lineStyle(1, 0xffffff, 0.5);
      g.strokeCircle(tcx, tcy, tr);
    }
  }

  // ── Oyuncu noktası ──────────────────────────────────────────────────────

  _drawPlayer(player) {
    if (!player || !player.alive) {
      this._playerDot.setVisible(false);
      return;
    }
    const mx = this._x + player.sprite.x * this._scale;
    const my = this._y + player.sprite.y * this._scale;
    this._playerDot.setPosition(mx, my).setVisible(true);
  }

  // ── Diğer oyuncular ────────────────────────────────────────────────────

  _drawOtherPlayers(others) {
    if (!others) {
      this._hideAllDots();
      return;
    }

    let idx = 0;
    const entries = others instanceof Map ? others.entries() : Object.entries(others);

    for (const [, p] of entries) {
      if (!p || p.alive === false) continue;

      const x = p.x ?? p.sprite?.x;
      const y = p.y ?? p.sprite?.y;
      if (x == null || y == null) continue;

      let dot = this._otherDots[idx];
      if (!dot) {
        dot = this.scene.add.rectangle(0, 0, 3, 3, 0xff4444)
          .setDepth(303).setScrollFactor(0).setOrigin(0.5);
        dot.setMask(this._mask);
        this._otherDots.push(dot);
      }

      dot.setPosition(this._x + x * this._scale, this._y + y * this._scale);
      dot.setVisible(true);
      idx++;
    }

    for (let i = idx; i < this._otherDots.length; i++) {
      this._otherDots[i].setVisible(false);
    }
  }

  _hideAllDots() {
    for (const d of this._otherDots) d.setVisible(false);
  }

  destroy() {
    this._bg?.destroy();
    this._border?.destroy();
    this._zoneGfx?.destroy();
    this._playerDot?.destroy();
    this._maskGfx?.destroy();
    for (const d of this._otherDots) d?.destroy();
    this._otherDots = [];
  }
}
