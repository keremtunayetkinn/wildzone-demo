// wildzone/client/src/scenes/BootScene.js

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // No external assets — everything generated via Graphics API
  }

  create() {
    this._generatePlaceholderAssets();
    this.scene.start('LobbyScene');
  }

  _generatePlaceholderAssets() {
    // ── Characters ──────────────────────────────────────────────────────
    const charColors = [0x4a90d9, 0xe74c3c, 0x2ecc71, 0xf39c12];
    const charNames  = ['char_1', 'char_2', 'char_3', 'char_4'];

    charColors.forEach((color, i) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      for (let frame = 0; frame < 4; frame++) {
        const fx = frame * 64;
        g.fillStyle(color, 1);
        g.fillCircle(fx + 32, 20, 16);
        g.fillRect(fx + 20, 36, 24, 28);
        g.fillStyle(0x222222, 1);
        g.fillRect(fx + 14, 40, 8, 20);
        g.fillRect(fx + 42, 40, 8, 20);
        g.fillRect(fx + 22, 64, 8, 14);
        g.fillRect(fx + 34, 64, 8, 14);
      }
      g.generateTexture(charNames[i], 256, 80);
      g.destroy();
    });

    // ── Accessories ──────────────────────────────────────────────────────
    this._makeAccessory('hat_1',  g => { g.fillStyle(0xe74c3c, 1); g.fillRect(8, 4, 32, 10); g.fillRect(12, 0, 24, 8); });
    this._makeAccessory('hat_2',  g => { g.fillStyle(0x8e44ad, 1); g.fillRect(4, 2, 40, 14); g.fillRect(0, 14, 48, 6); });
    this._makeAccessory('hat_3',  g => { g.fillStyle(0x2c3e50, 1); g.fillTriangle(24, 0, 2, 20, 46, 20); });
    this._makeAccessory('mask_1', g => { g.fillStyle(0x111111, 1); g.fillRect(6, 8, 36, 12); });
    this._makeAccessory('mask_2', g => {
      g.fillStyle(0xcc2222, 1); g.fillRect(4, 6, 40, 18);
      g.fillStyle(0x000000, 1); g.fillRect(10, 10, 8, 8); g.fillRect(30, 10, 8, 8);
    });
    this._makeAccessory('cape_1', g => { g.fillStyle(0x8e44ad, 1); g.fillTriangle(0, 0, 48, 0, 24, 40); });
    this._makeAccessory('cape_2', g => { g.fillStyle(0xcc2222, 1); g.fillTriangle(0, 0, 48, 0, 24, 40); });

    // ── Pistol ──────────────────────────────────────────────────────────
    const pg = this.make.graphics({ x: 0, y: 0, add: false });
    pg.fillStyle(0x888888, 1); pg.fillRect(0, 4, 24, 8);
    pg.fillStyle(0x555555, 1); pg.fillRect(8, 0, 8, 6);
    pg.generateTexture('pistol', 24, 14);
    pg.destroy();

    // ── Terrain ──────────────────────────────────────────────────────────
    const tg = this.make.graphics({ x: 0, y: 0, add: false });
    tg.fillStyle(0x2d5a1b, 1); tg.fillRect(0, 0, 128, 128);
    tg.fillStyle(0x245014, 1); tg.fillRect(0, 0, 64, 64); tg.fillRect(64, 64, 64, 64);
    tg.fillStyle(0x346620, 1); tg.fillRect(8, 8, 20, 20); tg.fillRect(80, 72, 24, 16);
    tg.generateTexture('grass', 128, 128);
    tg.destroy();

    const trg = this.make.graphics({ x: 0, y: 0, add: false });
    trg.fillStyle(0x5d4037, 1); trg.fillRect(18, 32, 12, 20);
    trg.fillStyle(0x1b5e20, 1); trg.fillCircle(24, 22, 22);
    trg.fillStyle(0x2e7d32, 1); trg.fillCircle(18, 18, 12);
    trg.generateTexture('tree', 48, 52);
    trg.destroy();

    const bg = this.make.graphics({ x: 0, y: 0, add: false });
    bg.fillStyle(0x33691e, 1); bg.fillCircle(16, 14, 14);
    bg.fillStyle(0x558b2f, 1); bg.fillCircle(24, 12, 10);
    bg.generateTexture('bush', 36, 28);
    bg.destroy();

    const rg = this.make.graphics({ x: 0, y: 0, add: false });
    rg.fillStyle(0x78909c, 1); rg.fillEllipse(20, 16, 38, 28);
    rg.fillStyle(0x90a4ae, 1); rg.fillEllipse(14, 10, 16, 10);
    rg.generateTexture('rock', 40, 32);
    rg.destroy();

    // Metal crate prop
    const mcg = this.make.graphics({ x: 0, y: 0, add: false });
    mcg.fillStyle(0x607d8b, 1); mcg.fillRect(0, 0, 40, 40);
    mcg.fillStyle(0x78909c, 1); mcg.fillRect(2, 2, 36, 36);
    mcg.fillStyle(0x455a64, 1);
    mcg.fillRect(0, 18, 40, 4);   // horizontal band
    mcg.fillRect(18, 0, 4, 40);   // vertical band
    mcg.fillStyle(0x90a4ae, 1);
    mcg.fillRect(6, 6, 10, 10); mcg.fillRect(24, 24, 10, 10); // corner bolts
    mcg.generateTexture('metal_crate', 40, 40);
    mcg.destroy();

    // Lobby bg
    const lbg = this.make.graphics({ x: 0, y: 0, add: false });
    lbg.fillStyle(0x0d2b0d, 1); lbg.fillRect(0, 0, 800, 600);
    lbg.generateTexture('lobby_bg', 800, 600);
    lbg.destroy();

    // ── Phase 2: Weapon loot sprites ─────────────────────────────────────

    // Shotgun pickup
    const sg = this.make.graphics({ x: 0, y: 0, add: false });
    sg.fillStyle(0xff6600, 1); sg.fillRect(0, 5, 30, 8); sg.fillRect(22, 2, 6, 6);
    sg.fillStyle(0x333333, 1); sg.fillRect(4, 5, 8, 8);
    sg.generateTexture('shotgun', 32, 16);
    sg.destroy();

    // SMG pickup
    const smgg = this.make.graphics({ x: 0, y: 0, add: false });
    smgg.fillStyle(0x0088cc, 1); smgg.fillRect(0, 4, 26, 8); smgg.fillRect(18, 0, 6, 6);
    smgg.fillStyle(0x222222, 1); smgg.fillRect(6, 4, 6, 10);
    smgg.generateTexture('smg', 28, 14);
    smgg.destroy();

    // Sniper pickup
    const snp = this.make.graphics({ x: 0, y: 0, add: false });
    snp.fillStyle(0x8800cc, 1); snp.fillRect(0, 5, 40, 6); snp.fillRect(30, 2, 8, 4);
    snp.fillStyle(0x555555, 1); snp.fillRect(8, 2, 6, 10);
    snp.generateTexture('sniper', 42, 14);
    snp.destroy();

    // Bazooka pickup
    const baz = this.make.graphics({ x: 0, y: 0, add: false });
    baz.fillStyle(0xcc2200, 1); baz.fillRect(0, 4, 38, 10); baz.fillCircle(36, 9, 6);
    baz.fillStyle(0x888888, 1); baz.fillRect(10, 7, 12, 4);
    baz.generateTexture('bazooka', 44, 18);
    baz.destroy();

    // Bush camo pickup (used as camouflage sprite overlay on player)
    const bcg = this.make.graphics({ x: 0, y: 0, add: false });
    bcg.fillStyle(0x2d6b1e, 1); bcg.fillCircle(24, 24, 22);
    bcg.fillStyle(0x44aa2a, 1); bcg.fillCircle(14, 18, 12); bcg.fillCircle(34, 16, 10); bcg.fillCircle(24, 32, 10);
    bcg.fillStyle(0x1a4a10, 1); bcg.fillCircle(20, 22, 6); bcg.fillCircle(30, 26, 5);
    bcg.generateTexture('bush_camo', 48, 48);
    bcg.destroy();

    // ── Phase 2: Armor sprites ────────────────────────────────────────────

    // Armor Lv1 (light blue vest)
    const a1 = this.make.graphics({ x: 0, y: 0, add: false });
    a1.fillStyle(0x4169E1, 1); a1.fillRect(4, 2, 24, 20); a1.fillRect(0, 4, 6, 14); a1.fillRect(26, 4, 6, 14);
    a1.generateTexture('armor_1', 32, 24);
    a1.destroy();

    // Armor Lv2 (purple vest)
    const a2 = this.make.graphics({ x: 0, y: 0, add: false });
    a2.fillStyle(0x8B008B, 1); a2.fillRect(4, 2, 24, 20); a2.fillRect(0, 4, 6, 14); a2.fillRect(26, 4, 6, 14);
    a2.fillStyle(0xdd00dd, 1); a2.fillRect(10, 8, 12, 4);
    a2.generateTexture('armor_2', 32, 24);
    a2.destroy();

    // Armor Lv3 (gold heavy armor)
    const a3 = this.make.graphics({ x: 0, y: 0, add: false });
    a3.fillStyle(0xFFD700, 1); a3.fillRect(2, 2, 28, 22); a3.fillRect(0, 4, 4, 14); a3.fillRect(28, 4, 4, 14);
    a3.fillStyle(0xffa500, 1); a3.fillRect(6, 8, 20, 4); a3.fillRect(6, 14, 20, 4);
    a3.generateTexture('armor_3', 32, 26);
    a3.destroy();
  }

  _makeAccessory(key, drawFn) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    drawFn(g);
    g.generateTexture(key, 48, 48);
    g.destroy();
  }
}
