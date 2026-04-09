// wildzone/client/src/scenes/HUDScene.js
import CONSTANTS from '../constants.js';

const WEAPON_LABELS = {
  fist: 'Yumruk', pistol: 'Tabanca', shotgun: 'Pompalı',
  smg: 'Makineli', sniper: 'Sniper', bazooka: 'Bazuka', harpoon: 'Zıpkın', bush: 'Çalı',
  sword: 'Kılıç', pickaxe: 'Kazma', axe: 'Balta'
};


export default class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' });
    this._reloadTimer = null;
    this._reloadDuration = 0;
    this._reloadStart = 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Koleksiyon: izleyici modunda gizlenecek tüm oyuncu HUD elemanları
    this._playerHUD = [];

    // ── Top-right: player count ────────────────────────────────────────────
    this.add.rectangle(W - 8, 8, 150, 36, 0x000000, 0.65).setOrigin(1, 0);
    this.countText = this.add.text(W - 140, 16, '👥 1 / 20', {
      fontSize: '13px', fill: '#cccccc', fontFamily: 'monospace'
    });

    // ── Bottom-center: weapon slots ───────────────────────────────────────
    const slotW = 100;
    const slotH = 52;
    const slotY = H - 10;
    const gap   = 6;
    // 3 slot ortalı: toplam genişlik = 3*slotW + 2*gap
    const totalW = 3 * slotW + 2 * gap;
    const slot1X = W / 2 - totalW / 2;
    const slot2X = slot1X + slotW + gap;
    const slot3X = slot2X + slotW + gap;

    // Slot 1
    this.slotBg1     = this.add.rectangle(slot1X, slotY, slotW, slotH, 0x000000, 0.70).setOrigin(0, 1);
    this.slotBorder1 = this.add.rectangle(slot1X, slotY, slotW, slotH, 0x00ff88, 0).setOrigin(0, 1).setStrokeStyle(2, 0x00ff88);
    this.slotLabel1  = this.add.text(slot1X + 4, slotY - slotH + 6, '[Q]', {
      fontSize: '10px', fill: '#aaaaaa', fontFamily: 'monospace'
    });
    this.slotWeapon1 = this.add.text(slot1X + 4, slotY - slotH + 22, '—', {
      fontSize: '13px', fill: '#555555', fontFamily: 'monospace'
    });
    this.slotAmmo1 = this.add.text(slot1X + 4, slotY - 16, '', {
      fontSize: '11px', fill: '#aaaaaa', fontFamily: 'monospace'
    });

    // Slot 2
    this.slotBg2     = this.add.rectangle(slot2X, slotY, slotW, slotH, 0x000000, 0.70).setOrigin(0, 1);
    this.slotBorder2 = this.add.rectangle(slot2X, slotY, slotW, slotH, 0x888888, 0).setOrigin(0, 1).setStrokeStyle(2, 0x555555);
    this.slotLabel2  = this.add.text(slot2X + 4, slotY - slotH + 6, '[Q]', {
      fontSize: '10px', fill: '#aaaaaa', fontFamily: 'monospace'
    });
    this.slotWeapon2 = this.add.text(slot2X + 4, slotY - slotH + 22, '—', {
      fontSize: '13px', fill: '#555555', fontFamily: 'monospace'
    });
    this.slotAmmo2 = this.add.text(slot2X + 4, slotY - 16, '', {
      fontSize: '11px', fill: '#aaaaaa', fontFamily: 'monospace'
    });

    // Slot 3 — Yakın dövüş (her zaman en az Yumruk)
    this.slotBg3     = this.add.rectangle(slot3X, slotY, slotW, slotH, 0x1a0a00, 0.80).setOrigin(0, 1);
    this.slotBorder3 = this.add.rectangle(slot3X, slotY, slotW, slotH, 0xff8844, 0).setOrigin(0, 1).setStrokeStyle(2, 0x885533);
    this.slotLabel3  = this.add.text(slot3X + 4, slotY - slotH + 6, '[G]', {
      fontSize: '10px', fill: '#ff8844', fontFamily: 'monospace'
    });
    this.slotWeapon3 = this.add.text(slot3X + 4, slotY - slotH + 22, 'Yumruk', {
      fontSize: '13px', fill: '#ffffff', fontFamily: 'monospace'
    });
    this.slotAmmo3 = this.add.text(slot3X + 4, slotY - 16, '∞', {
      fontSize: '11px', fill: '#886644', fontFamily: 'monospace'
    });
    // ── Stamina bar (above weapon slots, orange) ────────────────────────
    const barW = totalW;
    const barH = 8;
    const staminaY = slotY - slotH - 6;
    this._staminaMaxW = barW;
    this._staminaBg = this.add.rectangle(slot1X, staminaY, barW, barH, 0x222222)
      .setOrigin(0, 0.5);
    this.staminaBar = this.add.rectangle(slot1X, staminaY, barW, barH, 0xff8c00)
      .setOrigin(0, 0.5);
    this._staminaBlinking = false;

    // ── Health bar (above stamina bar, green/yellow/red) ──────────────
    const healthY = staminaY - barH - 4;
    this._hpMaxW = barW;
    this._hpBg = this.add.rectangle(slot1X, healthY, barW, barH, 0x222222)
      .setOrigin(0, 0.5);
    this.hpBar = this.add.rectangle(slot1X, healthY, barW, barH, 0x4caf50)
      .setOrigin(0, 0.5);

    this._playerHUD.push(
      this.slotBg1, this.slotBorder1, this.slotLabel1, this.slotWeapon1, this.slotAmmo1,
      this.slotBg2, this.slotBorder2, this.slotLabel2, this.slotWeapon2, this.slotAmmo2,
      this.slotBg3, this.slotBorder3, this.slotLabel3, this.slotWeapon3, this.slotAmmo3,
      this._staminaBg, this.staminaBar, this._hpBg, this.hpBar
    );

    // ── Bottom-right: ammo counter ────────────────────────────────────────
    this._ammoBg = this.add.rectangle(W - 8, H - 10, 180, 52, 0x000000, 0.65).setOrigin(1, 1);
    this.ammoMagText = this.add.text(W - 180, H - 50, '', {
      fontSize: '22px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    });
    this.ammoInvText = this.add.text(W - 100, H - 22, '', {
      fontSize: '13px', fill: '#aaaaaa', fontFamily: 'monospace'
    });
    this._playerHUD.push(this._ammoBg, this.ammoMagText, this.ammoInvText);

    // ── Bottom-left: kaynak HUD ──────────────────────────────────────────
    this._resBg = this.add.rectangle(8, H - 120, 210, 28, 0x000000, 0.65).setOrigin(0, 0);
    this.resWoodText  = this.add.text(14, H - 112, '🪵 0', {
      fontSize: '13px', fill: '#c8a060', fontFamily: 'monospace'
    });
    this.resStoneText = this.add.text(74, H - 112, '🪨 0', {
      fontSize: '13px', fill: '#aaaaaa', fontFamily: 'monospace'
    });
    this.resMetalText = this.add.text(132, H - 112, '⚙️ 0', {
      fontSize: '13px', fill: '#88ccee', fontFamily: 'monospace'
    });
    this._playerHUD.push(this._resBg, this.resWoodText, this.resStoneText, this.resMetalText);

    // Barikat sayacı
    this._barricadeBg = this.add.rectangle(8, H - 90, 100, 24, 0x000000, 0.65).setOrigin(0, 0);
    this.barricadeCountText = this.add.text(14, H - 86, '🧱 0/5', {
      fontSize: '13px', fill: '#ccaa66', fontFamily: 'monospace'
    });
    this._playerHUD.push(this._barricadeBg, this.barricadeCountText);

    // Yetersiz kaynak uyarısı (2 sn, kırmızı, gizli)
    this.noResWarning = this.add.text(W / 2, H - 90, 'Yetersiz Odun!', {
      fontSize: '16px', fill: '#ff4444', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setVisible(false);

    // ── Bottom-left: bush indicator ──────────────────────────────────────
    this.bushIndicator = this.add.text(14, H - 64, '🌿', {
      fontSize: '22px'
    }).setAlpha(0.3);
    this.bushLabel = this.add.text(42, H - 60, 'Kamuflaj', {
      fontSize: '12px', fill: '#3a7a3a', fontFamily: 'monospace'
    }).setAlpha(0.3);
    this._playerHUD.push(this.bushIndicator, this.bushLabel);

    // ── İnşaat modu göstergesi ────────────────────────────────────────────
    this.buildModeBg = this.add.rectangle(W / 2, H - 75, 280, 44, 0x000000, 0.75)
      .setOrigin(0.5).setVisible(false);
    this.buildModeText = this.add.text(W / 2, H - 84, '🔨 İNŞAAT MODU  [Sol Tık: Koy]  [F: Çık]', {
      fontSize: '12px', fill: '#ffdd44', fontFamily: 'monospace'
    }).setOrigin(0.5).setVisible(false);
    this.buildMatText = this.add.text(W / 2, H - 66, '[Q] Materyal: Ahşap', {
      fontSize: '12px', fill: '#cccccc', fontFamily: 'monospace'
    }).setOrigin(0.5).setVisible(false);
    this._playerHUD.push(this.buildModeBg, this.buildModeText, this.buildMatText);

    // ── Reload bar ────────────────────────────────────────────────────────
    this.reloadBg = this.add.rectangle(W / 2, H - 72, 220, 14, 0x000000, 0.75).setOrigin(0.5, 0.5).setVisible(false);
    this.reloadBar = this.add.rectangle(W / 2 - 110 + 1, H - 72, 0, 12, 0xffaa00).setOrigin(0, 0.5).setVisible(false);
    this.reloadText = this.add.text(W / 2, H - 72, 'Şarj ediliyor...', {
      fontSize: '10px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setVisible(false);
    this._playerHUD.push(this.reloadBg, this.reloadBar, this.reloadText);

    // ── Camo vignette (green edge) ────────────────────────────────────────
    this.camoVignette = this.add.graphics();
    this.camoVignette.setVisible(false);
    this._drawVignette(W, H);
    this._playerHUD.push(this.camoVignette);

    // ── Zone timer (minimap altında, sol üst) ──────────────────────────────
    // Minimap: x=10, y=10, 160x160 — timer hemen altına
    const mmBottom = 10 + 160 + 4;   // MM_MARGIN + MM_SIZE + gap
    const mmCenterX = 10 + 80;       // MM_MARGIN + MM_SIZE/2
    this._zoneBg = this.add.rectangle(10, mmBottom, 160, 38, 0x000000, 0.7)
      .setOrigin(0, 0);
    this._zonePhaseText = this.add.text(mmCenterX, mmBottom + 4, 'Faz 1 / 6', {
      fontSize: '11px', fill: '#ff6666', fontFamily: 'monospace'
    }).setOrigin(0.5, 0);
    this._zoneTimerText = this.add.text(mmCenterX, mmBottom + 18, '1:00', {
      fontSize: '16px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this._playerHUD.push(this._zoneBg, this._zonePhaseText, this._zoneTimerText);

    // ── Zone dışı uyarı (ekran ortası) ────────────────────────────────────
    this._zoneWarning = this.add.text(W / 2, H / 3, '⚠ ALAN DIŞINDASIN!', {
      fontSize: '20px', fill: '#ff4444', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setVisible(false).setAlpha(0);
    this._zoneWarningActive = false;

    // Listen for game events
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.on('inventory_changed', () => this._refreshFromGame(), this);
      gameScene.events.on('reload_start', (data) => this._showReload(data), this);
      gameScene.events.on('reload_complete', () => this._hideReload(), this);
      gameScene.events.on('resource_changed', (res) => this.updateResources(res), this);
      gameScene.events.on('barricade_count_changed', (n) => this.updateBarricadeCount(n), this);
      gameScene.events.on('barricade_no_resources', (type) => this._showNoResWarning(type), this);
      gameScene.events.on('build_mode_changed', (active) => this._setBuildMode(active), this);
      gameScene.events.on('build_material_cycled', ({ label }) => this._updateBuildMat(label), this);
      gameScene.events.on('spectator_mode_changed', (active) => this.setSpectatorMode(active), this);
      gameScene.events.on('zone_damage', () => this._flashZoneWarning(), this);
      gameScene.events.on('zone_phase_change', (d) => this._onZonePhaseChange(d), this);
      gameScene.events.on('zone_shrink_start', () => this._onZoneShrinkStart(), this);
      gameScene.events.on('zone_finished', () => this._onZoneFinished(), this);
    }

    this.updateAmmo(0, 0);
  }

  setSpectatorMode(active) {
    this._isSpectator = active;
    for (const obj of this._playerHUD) {
      if (obj && obj.active !== false) obj.setVisible(!active);
    }
    if (active) this.noResWarning?.setVisible(false);
  }

  _drawVignette(W, H) {
    const g = this.camoVignette;
    g.clear();
    const thickness = 40;
    g.lineStyle(thickness, 0x00ff44, 0.35);
    g.strokeRect(thickness / 2, thickness / 2, W - thickness, H - thickness);
  }

  // ── Public update methods (called from GameScene) ──────────────────────

  updateHUDHP(hp) {
    const pct = hp / 100;
    this.hpBar.setDisplaySize(this._hpMaxW * pct, 8);

    if (pct > 0.5)       this.hpBar.setFillStyle(0x4caf50);
    else if (pct > 0.25) this.hpBar.setFillStyle(0xffeb3b);
    else                 this.hpBar.setFillStyle(0xf44336);
  }

  updateStamina(stamina) {
    const pct = stamina / 100;
    this.staminaBar.setDisplaySize(this._staminaMaxW * pct, 8);
    this.staminaBar.setFillStyle(0xff8c00);

    // Blink when depleted
    if (stamina <= 0 && !this._staminaBlinking) {
      this._staminaBlinking = true;
      this.tweens.add({
        targets: this.staminaBar,
        alpha: 0.3,
        duration: 200,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.staminaBar.setAlpha(1);
          this._staminaBlinking = false;
        }
      });
    }
  }

  updateArmor() {} // Zırh artık karakter üstünde gösteriliyor

  updateInventory(inventory) {
    if (!inventory) return;

    const activeSlot = inventory.activeSlot;

    // Slot 1 (ateşli/utility)
    const w1Id = inventory.weapons[0];
    this.slotWeapon1.setText(w1Id ? (WEAPON_LABELS[w1Id] || w1Id) : '—').setFill(w1Id ? '#ffffff' : '#555555');
    if (w1Id) {
      const mag1 = inventory.magazineAmmo[0] || 0;
      const inv1 = inventory.ammo[inventory.getWeaponData(w1Id)?.ammoType] || 0;
      this.slotAmmo1.setText(`${mag1}/${inv1}`);
    } else {
      this.slotAmmo1.setText('');
    }

    // Slot 2 (ateşli/utility)
    const w2Id = inventory.weapons[1];
    this.slotWeapon2.setText(w2Id ? (WEAPON_LABELS[w2Id] || w2Id) : '—').setFill(w2Id ? '#ffffff' : '#555555');
    if (w2Id) {
      const mag2 = inventory.magazineAmmo[1] || 0;
      const inv2 = inventory.ammo[inventory.getWeaponData(w2Id)?.ammoType] || 0;
      this.slotAmmo2.setText(`${mag2}/${inv2}`);
    } else {
      this.slotAmmo2.setText('');
    }

    // Slot 3 (yakın dövüş — yumruk varsayılan)
    const w3Id = inventory.weapons[2];
    this.slotWeapon3.setText(w3Id ? (WEAPON_LABELS[w3Id] || w3Id) : 'Yumruk').setFill('#ffffff');
    this.slotAmmo3.setText('∞');

    // Active slot highlight
    const activeAlpha = 0.9;
    const inactiveAlpha = 0.45;
    this.slotBg1.setAlpha(activeSlot === 0 ? activeAlpha : inactiveAlpha);
    this.slotBg2.setAlpha(activeSlot === 1 ? activeAlpha : inactiveAlpha);
    this.slotBg3.setAlpha(activeSlot === 2 ? activeAlpha : inactiveAlpha);
    this.slotBorder1.setStrokeStyle(2, activeSlot === 0 ? 0x00ff88 : 0x333333, activeSlot === 0 ? 1 : 0.3);
    this.slotBorder2.setStrokeStyle(2, activeSlot === 1 ? 0x00ff88 : 0x333333, activeSlot === 1 ? 1 : 0.3);
    this.slotBorder3.setStrokeStyle(2, activeSlot === 2 ? 0xff8844 : 0x553322, activeSlot === 2 ? 1 : 0.4);

    // Ammo counter (active weapon)
    const activeWeapon = inventory.getActiveWeaponData();
    if (activeWeapon && activeWeapon.ammoType) {
      const inMag = inventory.getMagazineAmmo();
      const inInv = inventory.getInventoryAmmo();
      this.ammoMagText.setText(`${inMag}`);
      this.ammoInvText.setText(`/ ${inInv}`);
    } else if (activeWeapon && activeWeapon.type === 'melee') {
      this.ammoMagText.setText('∞');
      this.ammoInvText.setText('');
    } else {
      this.ammoMagText.setText('');
      this.ammoInvText.setText('');
    }

    // Bush indicator — now checks armor system instead of weapon inventory
    const gamePlayer = this.scene.get('GameScene')?.player;
    const hasBush = gamePlayer?.armorSystem?.currentArmor?.id === 'bush';
    const bushActive = gamePlayer?.isCamouflaged;
    this.bushIndicator.setAlpha(hasBush ? (bushActive ? 1 : 0.5) : 0.2);
    this.bushLabel.setAlpha(hasBush ? (bushActive ? 1 : 0.5) : 0.2);
    this.bushLabel.setFill(bushActive ? '#55ff55' : '#3a7a3a');
    this.camoVignette.setVisible(!!bushActive);
  }

  updateResources({ wood = 0, stone = 0, metal = 0 } = {}) {
    this.resWoodText?.setText(`🪵 ${wood}`);
    this.resStoneText?.setText(`🪨 ${stone}`);
    this.resMetalText?.setText(`⚙️ ${metal}`);
  }

  updateBarricadeCount(n) {
    const max = 5; // BARRICADE.maxActive
    this.barricadeCountText?.setText(`🧱 ${n}/${max}`);
  }

  _showNoResWarning(type) {
    if (!this.noResWarning) return;
    const labels = { wood: 'Odun', stone: 'Taş', metal: 'Metal' };
    this.noResWarning.setText(`Yetersiz ${labels[type] ?? 'Kaynak'}!`);
    this.noResWarning.setVisible(true).setAlpha(1);
    if (this._noResTween) this._noResTween.stop();
    this._noResTween = this.tweens.add({
      targets:  this.noResWarning,
      alpha:    0,
      delay:    1200,
      duration: 800,
      onComplete: () => this.noResWarning.setVisible(false)
    });
  }

  _setBuildMode(active) {
    if (this._isSpectator) return;
    this.buildModeBg?.setVisible(active);
    this.buildModeText?.setVisible(active);
    this.buildMatText?.setVisible(active);
  }

  _updateBuildMat(label) {
    this.buildMatText?.setText(`[Q] Materyal: ${label}`);
  }

  // Legacy method kept for compatibility
  updateAmmo(current, max) {
    // No-op: inventory_changed event handles this now
  }

  updatePlayerCount(count) {
    this.countText.setText(`👥 ${count} / ${CONSTANTS.MAX_PLAYERS}`);
  }

  _showReload(data) {
    if (this._isSpectator) return;
    this.reloadBg.setVisible(true);
    this.reloadBar.setVisible(true).setDisplaySize(0, 12);
    this.reloadText.setVisible(true);
    this._reloadStart = Date.now();
    this._reloadDuration = data.duration || 1000;

    if (this._reloadTween) this._reloadTween.stop();
    this._reloadTween = this.tweens.add({
      targets: this.reloadBar,
      displayWidth: 218,
      duration: this._reloadDuration,
      ease: 'Linear'
    });
  }

  _hideReload() {
    this.reloadBg.setVisible(false);
    this.reloadBar.setVisible(false);
    this.reloadText.setVisible(false);
    if (this._reloadTween) this._reloadTween.stop();
  }

  _refreshFromGame() {
    if (this._isSpectator) return;
    const gameScene = this.scene.get('GameScene');
    if (!gameScene || !gameScene.player) return;
    this.updateInventory(gameScene.player.inventory);
    this.updateArmor(gameScene.player.armorSystem);
  }

  // ── Zone HUD methods ───────────────────────────────────────────────────

  updateZoneTimer(zoneSystem) {
    if (!zoneSystem) return;
    const info = zoneSystem.getTimerInfo();
    const phase = info.phaseIndex + 1;
    const total = info.total;

    if (info.state === 'finished') {
      this._zonePhaseText.setText('ZONE BİTTİ');
      this._zoneTimerText.setText('☠');
      return;
    }

    const secs = Math.ceil(info.remaining / 1000);
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;

    const stateLabel = info.state === 'shrinking' ? 'DARALIYOR' : 'Bekleme';
    this._zonePhaseText.setText(`Faz ${phase}/${total}  ${stateLabel}`);
    this._zoneTimerText.setText(timeStr);

    // Shrinking sırasında kırmızı yanıp sönsün
    if (info.state === 'shrinking') {
      this._zoneTimerText.setFill('#ff4444');
      this._zoneBg.setFillStyle(0x330000, 0.8);
    } else {
      this._zoneTimerText.setFill('#ffffff');
      this._zoneBg.setFillStyle(0x000000, 0.7);
    }
  }

  _onZonePhaseChange(data) {
    const phase = data.phaseIndex + 1;
    this._zonePhaseText.setText(`Faz ${phase}/6  Bekleme`);
  }

  _onZoneShrinkStart() {
    this._zonePhaseText.setFill('#ff4444');
  }

  _onZoneFinished() {
    this._zonePhaseText.setText('ZONE BİTTİ').setFill('#ff0000');
    this._zoneTimerText.setText('☠').setFill('#ff0000');
  }

  _flashZoneWarning() {
    if (this._zoneWarningActive) return;
    this._zoneWarningActive = true;
    this._zoneWarning.setVisible(true);
    this.tweens.add({
      targets: this._zoneWarning,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 600,
      onComplete: () => {
        this._zoneWarning.setAlpha(0).setVisible(false);
        this._zoneWarningActive = false;
      }
    });
  }
}
