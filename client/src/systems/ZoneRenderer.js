// wildzone/client/src/systems/ZoneRenderer.js
// Zone dışı kırmızı overlay + güvenli alan sınırı + hedef sınırı çizimi
//
// Overlay artık world-space Graphics + GeometryMask kullanıyor.
// Mask, render aşamasında kamera dönüşümünden geçtiği için
// kamera follow-lerp gecikmesi sorunu ortadan kalkar.

import CONSTANTS from '../constants.js';
import { ZONE } from '../constants/zone.js';

const PAD = 1000; // harita kenarı taşma payı

export default class ZoneRenderer {
  constructor(scene, zoneSystem) {
    this.scene = scene;
    this.zone = zoneSystem;

    // ── Kırmızı zone overlay (world-space, tüm haritayı kaplar) ─────────
    this._overlay = scene.add.graphics().setDepth(90).setAlpha(ZONE.OVERLAY_ALPHA);
    this._overlay.fillStyle(ZONE.OVERLAY_COLOR, 1);
    this._overlay.fillRect(
      -PAD, -PAD,
      CONSTANTS.MAP_WIDTH + PAD * 2,
      CONSTANTS.MAP_HEIGHT + PAD * 2
    );

    // Mask shape (world-space daire — güvenli alan)
    this._maskGfx = scene.make.graphics();
    const mask = this._maskGfx.createGeometryMask();
    mask.invertAlpha = true; // Dairenin DIŞINDA overlay görünür
    this._overlay.setMask(mask);

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

    // Border throttle — shrinking sırasında 30fps yeterli
    this._lastBorderTime = -999;
    this._borderInterval = 33; // ms (~30fps)

    // Mask dirty flag
    this._lastMaskCX = -1;
    this._lastMaskCY = -1;
    this._lastMaskR  = -1;

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

    // Mask güncelle (world-space — kamera gecikmesi yok)
    const maskDirty = cx !== this._lastMaskCX || cy !== this._lastMaskCY
      || Math.abs(r - this._lastMaskR) > 0.5;
    if (maskDirty) {
      this._lastMaskCX = cx;
      this._lastMaskCY = cy;
      this._lastMaskR  = r;
      this._maskGfx.clear();
      this._maskGfx.fillStyle(0xffffff, 1);
      this._maskGfx.fillCircle(cx, cy, Math.max(r, 0));
    }

    this._renderTargetBorderIfDirty();
    this._updateVignette(player);
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
    } else if (info.state === 'shifting') {
      g.lineStyle(2, 0x44aaff, 0.6);
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
    if (this._overlay) {
      this._overlay.clearMask(true); // mask'ı da temizle
      this._overlay.destroy();
    }
    this._maskGfx?.destroy();
    this._borderGfx?.destroy();
    this._targetBorderGfx?.destroy();
    this._vignette?.destroy();
  }
}
