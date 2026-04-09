// wildzone/client/src/systems/ZoneRenderer.js
// Zone dışı kırmızı overlay + güvenli alan sınırı + hedef sınırı çizimi

import { ZONE } from '../constants/zone.js';

export default class ZoneRenderer {
  constructor(scene, zoneSystem) {
    this.scene = scene;
    this.zone = zoneSystem;

    // ── Kırmızı zone overlay (viewport-sized RT, screen-space) ──────────
    const vw = scene.scale.width;
    const vh = scene.scale.height;

    this._rt = scene.add.renderTexture(0, 0, vw, vh)
      .setOrigin(0, 0)
      .setDepth(90)
      .setAlpha(ZONE.OVERLAY_ALPHA)
      .setScrollFactor(0);

    // Dolgu grafik objesi (kırmızı dikdörtgen — viewport boyutunda)
    this._fillGfx = scene.add.graphics().setVisible(false);
    this._fillGfx.fillStyle(ZONE.OVERLAY_COLOR, 1);
    this._fillGfx.fillRect(0, 0, vw, vh);

    // Silme objesi (beyaz daire — güvenli alan)
    this._eraseGfx = scene.add.graphics().setVisible(false);

    // ── Güvenli alan sınır çizgisi (mevcut) ──────────────────────────────
    this._borderGfx = scene.add.graphics().setDepth(91);

    // ── Hedef alan sınır çizgisi (beyaz, kesikli görünüm) ────────────────
    this._targetBorderGfx = scene.add.graphics().setDepth(91);

    // ── Vignette (oyuncu zone dışındayken kamera kenarında kırmızı) ──────
    this._vignette = scene.add.graphics().setDepth(200).setScrollFactor(0).setVisible(false);
    this._drawVignette();

    this._isOutside = false;

    // Dirty flag — border için
    this._lastCX = -1;
    this._lastCY = -1;
    this._lastR  = -1;

    // Overlay throttle — viewport-sized RT, 20fps yeterli
    this._lastOverlayTime = -999;
    this._overlayInterval = 50; // ms

    // Border throttle — shrinking sırasında 30fps yeterli
    this._lastBorderTime = -999;
    this._borderInterval = 33; // ms (~30fps)

    // Target border dirty flag — hedef sabit, sadece state değişince yeniden çiz
    this._lastTargetCX = -1;
    this._lastTargetCY = -1;
    this._lastTargetR  = -1;
    this._lastTargetState = '';
  }

  /** Her frame çağrılır */
  update(player) {
    const now = this.scene.time.now;
    const cx = this.zone.center.x;
    const cy = this.zone.center.y;
    const r  = this.zone.radius;

    const zoneChanged = cx !== this._lastCX || cy !== this._lastCY || Math.abs(r - this._lastR) > 0.5;
    if (zoneChanged) {
      this._lastCX = cx;
      this._lastCY = cy;
      this._lastR  = r;

      // Sınır çizgisi (world-space) — sadece zone değişince, 30fps throttle
      if (now - this._lastBorderTime >= this._borderInterval) {
        this._lastBorderTime = now;
        this._renderBorder(cx, cy, r);
      }
    }

    // Overlay (screen-space RT) — kamera veya zone hareket ettiğinde yeniden çiz
    if (now - this._lastOverlayTime >= this._overlayInterval) {
      this._lastOverlayTime = now;
      this._renderOverlay(cx, cy, r);
    }

    this._renderTargetBorderIfDirty();
    this._updateVignette(player);
  }

  // ── Overlay: kırmızı katman + güvenli alan deliği ────────────────────────

  _renderOverlay(cx, cy, r) {
    const cam = this.scene.cameras.main;
    const sx = cx - cam.scrollX;
    const sy = cy - cam.scrollY;

    const rt = this._rt;
    rt.clear();
    rt.draw(this._fillGfx);

    this._eraseGfx.clear();
    this._eraseGfx.fillStyle(0xffffff, 1);
    this._eraseGfx.fillCircle(sx, sy, r);
    rt.erase(this._eraseGfx);
  }

  // ── Güvenli alan sınır çizgisi ────────────────────────────────────────────

  _renderBorder(cx, cy, r) {
    const g = this._borderGfx;
    g.clear();
    g.lineStyle(ZONE.BORDER_WIDTH, ZONE.BORDER_COLOR, ZONE.BORDER_ALPHA);
    g.strokeCircle(cx, cy, r);
  }

  // ── Hedef alan sınır çizgisi (beyaz, sadece shrinking sırasında) ──────────
  // Hedef sabit kalır — dirty flag ile sadece state/hedef değişince yeniden çiz

  _renderTargetBorderIfDirty() {
    const info = this.zone.getTimerInfo();
    const tcx = this.zone.targetCenter.x;
    const tcy = this.zone.targetCenter.y;
    const tr  = this.zone.targetRadius;

    const changed = info.state !== this._lastTargetState
      || tcx !== this._lastTargetCX
      || tcy !== this._lastTargetCY
      || tr  !== this._lastTargetR;
    if (!changed) return;

    this._lastTargetState = info.state;
    this._lastTargetCX = tcx;
    this._lastTargetCY = tcy;
    this._lastTargetR  = tr;

    const g = this._targetBorderGfx;
    g.clear();

    if (info.state === 'shrinking') {
      g.lineStyle(2, 0xffffff, 0.6);
      this._drawDashedCircle(g, tcx, tcy, tr, 64);
    }
  }

  _drawDashedCircle(g, cx, cy, r, segments) {
    const step = (Math.PI * 2) / segments;
    for (let i = 0; i < segments; i += 2) {
      const a1 = step * i;
      const a2 = step * (i + 1);
      g.beginPath();
      g.arc(cx, cy, r, a1, a2, false);
      g.strokePath();
    }
  }

  // ── Vignette ──────────────────────────────────────────────────────────────

  _drawVignette() {
    const g = this._vignette;
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const t = ZONE.VIGNETTE_THICKNESS;

    g.clear();
    g.lineStyle(t, ZONE.VIGNETTE_COLOR, ZONE.VIGNETTE_ALPHA);
    g.strokeRect(t / 2, t / 2, W - t, H - t);
  }

  _updateVignette(player) {
    if (!player || !player.alive) {
      this._vignette.setVisible(false);
      return;
    }
    const outside = !this.zone.isInsideZone(player.sprite.x, player.sprite.y);
    if (outside !== this._isOutside) {
      this._isOutside = outside;
      this._vignette.setVisible(outside);
    }
  }

  destroy() {
    this._rt?.destroy();
    this._fillGfx?.destroy();
    this._eraseGfx?.destroy();
    this._borderGfx?.destroy();
    this._targetBorderGfx?.destroy();
    this._vignette?.destroy();
  }
}
