// wildzone/client/src/scenes/GameScene.js
import CONSTANTS from '../constants.js';
import NetworkSystem from '../systems/NetworkSystem.js';
import InputSystem from '../systems/InputSystem.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import LootSystem from '../systems/LootSystem.js';
import PropSystem from '../systems/PropSystem.js';
import MeleeSystem from '../systems/MeleeSystem.js';
import BarricadeSystem from '../systems/BarricadeSystem.js';
import Player from '../entities/Player.js';
import RemotePlayer from '../entities/RemotePlayer.js';
import TestBot from '../entities/TestBot.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.remotePlayers = new Map();
    this.myData = null;
    this.player = null;
    this._spectatorMode = false;
    this._spectatorTarget = null;
    this._spectatorOverlay = null;
    this._gameOver = false;
  }

  init(data) {
    this.playerConfig = data;
  }

  create() {
    this.propSystem = new PropSystem(this);
    this._buildMap();

    this.network   = new NetworkSystem(this);
    this.input_sys = new InputSystem(this);
    this.weapon    = new WeaponSystem(this);
    this.lootSystem = new LootSystem(this);

    this._setupNetworkEvents();

    this.network.sendJoin({
      username:  this.playerConfig.username,
      character: this.playerConfig.character,
      accessory: this.playerConfig.accessory
    });

    this.physics.world.setBounds(0, 0, CONSTANTS.MAP_WIDTH, CONSTANTS.MAP_HEIGHT);

    // Update HUD whenever inventory changes (loot pickup, reload, etc.)
    this.events.on('inventory_changed', () => this._updateHUD(), this);

    this.input.mouse.disableContextMenu();
  }

  _buildMap() {
    this.add.tileSprite(0, 0, CONSTANTS.MAP_WIDTH, CONSTANTS.MAP_HEIGHT, 'grass')
      .setOrigin(0, 0).setDepth(0);

    // Tüm prop spawn'u PropSystem'e delege edildi
    this.propSystem.spawnProps();

    this.events.once('weaponready', () => {
      this.weapon.addCollider(this.propSystem.getColliderGroup());
      if (this.barricadeSystem) {
        this.weapon.addCollider(this.barricadeSystem.getBarricadeGroup());
      }
    });

    this.events.on('missile_explode', ({ x, y, radius, damage }) => {
      this._doSplashDamage(x, y, radius, damage);
    });
  }

  _setupNetworkEvents() {
    this.network.onPlayerJoined((data) => {
      this.myData = data.me;

      this.player = new Player(
        this,
        data.me.x, data.me.y,
        this.playerConfig.character,
        this.playerConfig.accessory,
        this.playerConfig.username
      );
      this.player.socketId = this.myData.socketId;

      // MeleeSystem: oyuncu oluştuktan sonra başlatılır
      this.meleeSystem = new MeleeSystem(this, this.player);
      // WeaponSystem'in _playerTargets dizisini paylaş (referans = her zaman güncel)
      this.meleeSystem._playerTargets = this.weapon._playerTargets;

      // BarricadeSystem
      this.barricadeSystem = new BarricadeSystem(this, this.player);
      this._buildMode = false;
      this._prevLeftDown = false;

      this.physics.add.collider(this.player.sprite, this.propSystem.getColliderGroup());
      this.physics.add.collider(this.player.sprite, this.barricadeSystem.getBarricadeGroup());

      this.cameras.main.setBounds(0, 0, CONSTANTS.MAP_WIDTH, CONSTANTS.MAP_HEIGHT);
      this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

      this.events.emit('weaponready');
      this.events.emit('resource_changed', this.player.resources.getAll());
      data.players.forEach(p => this._addRemotePlayer(p));

      // Spawn loot after map and player are ready
      this.lootSystem.spawnInitialLoot();

      // TEST BOTS — geçici deneme botları
      const onBotDeath = () => {
        if (this._gameOver) return;
        const aliveCount = (this.player?.alive ? 1 : 0)
          + [...this.remotePlayers.values()].filter(rp => rp.alive).length
          + this.testBots.filter(b => b.alive).length;
        if (aliveCount === 1 && this.player?.alive) {
          this._gameOver = true;
          this._showGameEndScreen(true, this.playerConfig.username, 1, this._totalPlayers);
        }
        this._updateHUD();
      };
      this.testBots = [
        new TestBot(this, data.me.x + 150, data.me.y,       onBotDeath),
        new TestBot(this, data.me.x - 150, data.me.y + 150, onBotDeath),
      ];
      for (const bot of this.testBots) {
        this.weapon.addPlayerOverlap(bot.sprite, (bullet) => {
          if (bot.alive) bot.setHP(bot.hp - (bullet._damage || 25));
        });
      }

      this._totalPlayers = 1 + this.testBots.length + data.players.length;

      this._updateHUD();
    });

    this.network.onPlayerNew((data) => {
      if (this.myData && data.id === this.myData.id) return;
      this._addRemotePlayer(data);
      this._updateHUD();
    });

    this.network.onPlayerMoved((data) => {
      const rp = this._getRemoteById(data.id);
      if (rp) rp.setTarget(data.x, data.y, data.rotation);
    });

    this.network.onPlayerShot((data) => {
      const rp = this._getRemoteById(data.shooterId);
      if (rp) {
        this.weapon.spawnRemoteBullet(data.x, data.y, data.targetX, data.targetY);
      }
    });

    this.network.onPlayerHit((data) => {
      if (!this.player) return;
      this.player.setHP(data.hp);
      // Sunucudan gelen armor durumunu senkronize et
      if (data.armor) {
        if (this.player.armorSystem.currentArmor) {
          this.player.armorSystem.currentArmor.durability = data.armor.durability;
        }
      } else {
        this.player.armorSystem.currentArmor = null;
      }
      this.player.updateArmorDisplay();
      this._updateHUD();
      this.cameras.main.shake(150, 0.008);
      this.player.deactivateCamouflage();
    });

    this.network.onPlayerDied((data) => {
      if (this.myData && data.id === this.myData.id) {
        this._handleLocalDeath();
      } else {
        const rp = this._getRemoteById(data.id);
        if (rp) {
          rp.die();
          this.remotePlayers.delete(rp.id);
          if (this._spectatorMode && this._spectatorTarget === rp) {
            this._spectatorTarget = null;
          }
        }
      }
      this._updateHUD();
    });

    this.network.onPlayerDisconnect((data) => {
      const rp = this._getRemoteById(data.id);
      if (rp) {
        if (this._spectatorMode && this._spectatorTarget === rp) {
          this._spectatorTarget = null;
        }
        rp.destroy();
        this.remotePlayers.delete(data.id);
      }
      this._updateHUD();
    });

    this.network.onRoomFull(() => {
      alert('Oda dolu! (40/40 oyuncu)');
      this.scene.start('LobbyScene');
    });

    this.network.onGameWinner((data) => {
      if (this._gameOver) return;
      this._gameOver = true;
      const isWinner = this.myData && data.id === this.myData.id;
      this._showGameEndScreen(isWinner, data.username, isWinner ? 1 : null, this._totalPlayers);
    });
  }

  _tickRegen(delta) {
    const now = Date.now();

    if (this.player?.alive && this.player.hp < CONSTANTS.PLAYER_HP) {
      if (now - this.player._lastDamageTime >= 4000) {
        this.player.setHP(Math.min(CONSTANTS.PLAYER_HP, this.player.hp + (100 / 17.5) * delta));
      }
    }

    for (const bot of this.testBots ?? []) {
      if (bot.alive && bot.hp < 100) {
        if (now - bot._lastDamageTime >= 4000) {
          bot.setHP(Math.min(100, bot.hp + (100 / 17.5) * delta));
        }
      }
    }
  }

  _doSplashDamage(x, y, radius, damage) {
    // Yerel oyuncu (ateşleyen dahil) — linear falloff
    if (this.player?.alive) {
      const dx = this.player.sprite.x - x;
      const dy = this.player.sprite.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        this.player.takeDamage(Math.round(damage * falloff));
        this.events.emit('hp_changed', this.player.hp);
      }
    }

    // TestBots — linear falloff
    for (const bot of this.testBots ?? []) {
      if (bot.alive) {
        const dx = bot.sprite.x - x;
        const dy = bot.sprite.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
          const falloff = 1 - dist / radius;
          bot.setHP(bot.hp - Math.round(damage * falloff));
        }
      }
    }

    // Uzak oyuncular
    for (const rp of this.remotePlayers.values()) {
      if (rp.alive) {
        const dx = rp.sprite.x - x;
        const dy = rp.sprite.y - y;
        if (dx * dx + dy * dy <= r2) {
          this.network.sendHit(rp.socketId);
        }
      }
    }
  }

  _addRemotePlayer(data) {
    if (this.remotePlayers.has(data.id)) return;
    const rp = new RemotePlayer(this, data);
    this.remotePlayers.set(data.id, rp);

    this.weapon.addPlayerOverlap(rp.sprite, (_bullet, _sprite) => {
      if (rp.alive && this.myData) {
        this.network.sendHit(rp.socketId);
      }
    });
  }

  _getRemoteById(id) {
    return this.remotePlayers.get(id) || null;
  }

  update() {
    if (!this.myData) return;

    // ── Spectator mode ────────────────────────────────────────────────────
    if (this._spectatorMode) {
      this._updateSpectator();
      this.weapon.update(this.game.loop.delta / 1000);
      this.remotePlayers.forEach(rp => rp.update());
      for (const bot of this.testBots ?? []) bot.update(this.game.loop.delta);
      return;
    }

    if (!this.player || !this.player.alive) return;

    const cam = this.cameras.main;
    const inv = this.player.inventory;

    // ── Movement ──────────────────────────────────────────────────────────
    const { vx, vy } = this.input_sys.getMovementVector();

    let speed = CONSTANTS.PLAYER_SPEED;

    // ── Sprint / Stamina ──────────────────────────────────────────────────
    const delta = this.game.loop.delta / 1000;
    const isMoving = (vx !== 0 || vy !== 0);
    const isSprinting = this.input_sys.isSprintDown() && isMoving && this.player.stamina > 0;

    if (isSprinting) {
      speed *= 1.5;
      this.player.stamina = Math.max(0, this.player.stamina - 22 * delta);
    } else if (!this.input_sys.isSprintDown() || !isMoving) {
      this.player.stamina = Math.min(100, this.player.stamina + 14 * delta);
    }

    const hud = this.scene.get('HUDScene');
    if (hud) {
      hud.updateStamina(this.player.stamina);
      hud.updateHUDHP(this.player.hp);
    }

    // Zıpkın çekme sırasında WASD hareketini devre dışı bırak
    if (!this.weapon?.isHarpoonPulling()) {
      this.player.sprite.setVelocity(vx * speed, vy * speed);
    }

    // Actual speed (px/s) for camouflage check
    const actualSpeed = Math.sqrt(
      this.player.sprite.body.velocity.x ** 2 +
      this.player.sprite.body.velocity.y ** 2
    );

    const rotation = this.input_sys.getAimAngle(
      this.player.sprite.x, this.player.sprite.y, cam
    );
    this.player.update(rotation);

    // ── Camouflage update ─────────────────────────────────────────────────
    if (this.player.isCamouflaged) {
      this.player.updateCamouflage(actualSpeed);
    }

    // ── Barikat inşaat modu toggle (F) ───────────────────────────────────
    if (this.barricadeSystem && this.input_sys.isBarricadeToggleJustDown()) {
      this._buildMode = !this._buildMode;
      if (!this._buildMode) this.barricadeSystem.hidePreview();
      this.events.emit('build_mode_changed', this._buildMode);
    }

    if (this._buildMode && this.barricadeSystem) {
      // Önizlemeyi her frame güncelle
      this.barricadeSystem.updatePreview();
      // Q → materyal döngüsü (inşaat moduna özel)
      if (this.input_sys.isSwitchJustDown()) {
        this.barricadeSystem.cycleMaterial();
      }
      // Sol tık → yerleştir (just-down tespiti)
      const lbDown = this.input.activePointer.leftButtonDown();
      if (lbDown && !this._prevLeftDown) {
        this.barricadeSystem.tryPlace();
      }
      this._prevLeftDown = lbDown;
    } else {
      this._prevLeftDown = false;

      // ── Weapon switch (inşaat modunda devre dışı) ──────────────────────
      let switchHappened = false;
      if (this.input_sys.isSwitchJustDown()) {
        if (inv.switchWeapon()) switchHappened = true;
      }
      if (this.input_sys.isMeleeJustDown()) {
        if (inv.setActiveSlot(2)) switchHappened = true;
      }
      if (switchHappened) {
        this.weapon.disableZoom();
        this.weapon.cancelReload();
        this.events.emit('inventory_changed');
      }
    }

    // ── Drop weapon ───────────────────────────────────────────────────────
    if (this.input_sys.isDropJustDown()) {
      this.lootSystem.dropWeapon(this.player, inv.activeSlot);
    }

    // ── Reload ────────────────────────────────────────────────────────────
    if (this.input_sys.isReloadJustDown()) {
      this.weapon.startReload(inv);
    }

    // ── Bush camouflage activate ──────────────────────────────────────────
    const currentWeapon = inv.getActiveWeaponData();
    if (!this._buildMode && currentWeapon.type === 'utility' && currentWeapon.id === 'bush') {
      if (this.input_sys.isFireDown() || this.input_sys.isInteractJustDown()) {
        if (!this.player.isCamouflaged) {
          this.player.activateCamouflage();
          this.events.emit('inventory_changed');
        }
      }
    }

    // ── Fire ──────────────────────────────────────────────────────────────
    if (!this._buildMode && this.input_sys.isFireDown() && currentWeapon.type !== 'utility') {
      if (this.player.isCamouflaged) {
        this.player.deactivateCamouflage(); // fire breaks camo
      }
      const fired = this.weapon.tryFire(
        this.player.sprite.x, this.player.sprite.y,
        rotation, this.network, inv
      );
      if (fired) {
        this.events.emit('inventory_changed');
      }
    }

    // ── Network position send (throttled inside NetworkSystem) ───────────
    this.network.sendMove(this.player.sprite.x, this.player.sprite.y, rotation);

    // ── Systems update ────────────────────────────────────────────────────
    this.weapon.update(delta);
    this.meleeSystem?.update();
    this.lootSystem.update(this.player);
    this.remotePlayers.forEach(rp => rp.update());
    for (const bot of this.testBots ?? []) bot.update(this.game.loop.delta);
    this._tickRegen(delta);
  }

  _updateHUD() {
    const botCount = (this.testBots ?? []).filter(b => b.alive).length;
    const count = this.remotePlayers.size + (this.player?.alive ? 1 : 0) + botCount;
    const hud = this.scene.get('HUDScene');
    if (!hud) return;

    hud.updatePlayerCount(count);

    if (this.player) {
      this.player.updateArmorDisplay();
      hud.updateInventory(this.player.inventory);
    }
  }

  _handleLocalDeath() {
    if (!this.player || !this.player.alive) return;
    // Sırayı ölmeden önce hesapla (kendisi dahil canlı sayısı = bitirdiği sıra)
    const rank  = 1
      + [...this.remotePlayers.values()].filter(rp => rp.alive).length
      + (this.testBots ?? []).filter(b => b.alive).length;
    const total = this._totalPlayers ?? rank;
    this.lootSystem.dropPlayerLoot(this.player);
    this.player.die();
    this._updateHUD();
    this._showDeathScreen(rank, total);
  }

  _enterSpectator() {
    this._spectatorMode = true;
    this._spectatorTargetIndex = 0;
    this.cameras.main.stopFollow();
    this.events.emit('spectator_mode_changed', true);

    const W = this.scale.width;
    const H = this.scale.height;

    // Alt çubuk (HUD'un üstünde görünmesi için alta alındı)
    const bar = this.add.rectangle(W / 2, H - 28, W, 44, 0x000000, 0.80)
      .setScrollFactor(0).setDepth(25);

    // ◄ Önceki butonu (sol)
    const prevBtn = this.add.text(40, H - 28, '◄', {
      fontSize: '22px', fill: '#aaaaaa', fontFamily: 'monospace'
    }).setScrollFactor(0).setOrigin(0.5).setDepth(26).setInteractive({ useHandCursor: true });
    prevBtn.on('pointerover', () => prevBtn.setStyle({ fill: '#ffffff' }));
    prevBtn.on('pointerout',  () => prevBtn.setStyle({ fill: '#aaaaaa' }));
    prevBtn.on('pointerdown', () => this._cycleSpectatorTarget(-1));

    // Mevcut isim etiketi (orta)
    this._spectatorLabel = this.add.text(W / 2, H - 28, 'İZLEYİCİ MODU', {
      fontSize: '13px', fill: '#ffcc00', fontFamily: 'monospace', fontStyle: 'bold'
    }).setScrollFactor(0).setOrigin(0.5).setDepth(26);

    // Sonraki ► butonu (sağ — Lobiye Dön'ün solunda)
    const nextBtn = this.add.text(W - 170, H - 28, '►', {
      fontSize: '22px', fill: '#aaaaaa', fontFamily: 'monospace'
    }).setScrollFactor(0).setOrigin(0.5).setDepth(26).setInteractive({ useHandCursor: true });
    nextBtn.on('pointerover', () => nextBtn.setStyle({ fill: '#ffffff' }));
    nextBtn.on('pointerout',  () => nextBtn.setStyle({ fill: '#aaaaaa' }));
    nextBtn.on('pointerdown', () => this._cycleSpectatorTarget(1));

    // Lobiye dön butonu (en sağ)
    const btn = this.add.rectangle(W - 70, H - 28, 120, 34, 0x333333, 0.90)
      .setScrollFactor(0).setDepth(25).setInteractive();
    this.add.text(W - 70, H - 28, 'Lobiye Dön', {
      fontSize: '12px', fill: '#aaaaaa', fontFamily: 'monospace'
    }).setScrollFactor(0).setOrigin(0.5).setDepth(26);

    btn.on('pointerdown', () => this._returnToLobby());

    this._spectatorOverlay = { bar, btn, prevBtn, nextBtn };
    this._spectatorTarget = null;

    // İlk hedefe otomatik odaklan
    this._cycleSpectatorTarget(0);
  }

  _getSpectatorTargets() {
    const targets = [];
    for (const rp of this.remotePlayers.values()) {
      if (rp.alive) targets.push(rp);
    }
    for (const bot of this.testBots ?? []) {
      if (bot.alive) targets.push(bot);
    }
    return targets;
  }

  _cycleSpectatorTarget(dir) {
    const targets = this._getSpectatorTargets();
    if (targets.length === 0) return;

    let nextIdx;
    if (dir === 0) {
      nextIdx = 0;
    } else {
      const currentIdx = this._spectatorTarget ? targets.indexOf(this._spectatorTarget) : -1;
      nextIdx = ((currentIdx < 0 ? 0 : currentIdx) + dir + targets.length) % targets.length;
    }

    this._spectatorTarget      = targets[nextIdx];
    this._spectatorTargetIndex = nextIdx;

    this.cameras.main.startFollow(this._spectatorTarget.sprite, true, 0.1, 0.1);

    const name = (this.testBots ?? []).includes(this._spectatorTarget)
      ? 'TEST BOT'
      : (this._spectatorTarget.nameLabel?.text || 'Oyuncu');
    if (this._spectatorLabel) {
      this._spectatorLabel.setText(`İZLEYİCİ — ${name}  (${nextIdx + 1}/${targets.length})`);
    }
  }

  _updateSpectator() {
    // Hedef ölmüşse bir sonraki hayatta olan hedefe geç
    if (!this._spectatorTarget || !this._spectatorTarget.alive) {
      const targets = this._getSpectatorTargets();
      if (targets.length > 0) {
        this._cycleSpectatorTarget(0);
      } else {
        // Kimse kalmadı
        if (!this._gameOver) this._showDeathScreen();
      }
    }
  }

  _showDeathScreen(rank, total) {
    this._spectatorMode = false;
    const W = this.scale.width;
    const H = this.scale.height;
    const overlay = [];

    overlay.push(
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65)
        .setScrollFactor(0).setDepth(28)
    );
    overlay.push(
      this.add.text(W / 2, H / 2 - 60, 'ÖLDÜN', {
        fontSize: '48px', fill: '#f44336', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4
      }).setScrollFactor(0).setOrigin(0.5).setDepth(29)
    );

    if (rank != null && total != null) {
      overlay.push(
        this.add.text(W / 2, H / 2 - 5, `#${rank}`, {
          fontSize: '40px', fill: '#ffcc00', fontFamily: 'monospace', fontStyle: 'bold'
        }).setScrollFactor(0).setOrigin(0.5).setDepth(29)
      );
      overlay.push(
        this.add.text(W / 2, H / 2 + 38, `${total} kişi arasında`, {
          fontSize: '16px', fill: '#aaaaaa', fontFamily: 'monospace'
        }).setScrollFactor(0).setOrigin(0.5).setDepth(29)
      );
    }

    // Ölüm anında hâlâ hayatta olan oyuncu sayısı (kendisi hariç)
    const remainingAlive = rank != null ? rank - 1 : 0;
    const canSpectate   = remainingAlive >= 2;

    if (canSpectate) {
      // İki buton yan yana
      const lobbyBtn = this.add.rectangle(W / 2 - 105, H / 2 + 90, 180, 44, 0x1a6b1a)
        .setScrollFactor(0).setDepth(29).setInteractive();
      overlay.push(lobbyBtn);
      overlay.push(
        this.add.text(W / 2 - 105, H / 2 + 90, 'Lobiye Dön', {
          fontSize: '16px', fill: '#7fff7f', fontFamily: 'monospace'
        }).setScrollFactor(0).setOrigin(0.5).setDepth(30)
      );

      const spectBtn = this.add.rectangle(W / 2 + 105, H / 2 + 90, 180, 44, 0x1a3b6b)
        .setScrollFactor(0).setDepth(29).setInteractive();
      overlay.push(spectBtn);
      overlay.push(
        this.add.text(W / 2 + 105, H / 2 + 90, 'İzleyici Modu', {
          fontSize: '16px', fill: '#7fb7ff', fontFamily: 'monospace'
        }).setScrollFactor(0).setOrigin(0.5).setDepth(30)
      );

      lobbyBtn.on('pointerdown', () => this._returnToLobby());
      spectBtn.on('pointerdown', () => {
        overlay.forEach(o => o.destroy());
        this._enterSpectator();
      });
    } else {
      // Tek buton ortada
      const btn = this.add.rectangle(W / 2, H / 2 + 90, 180, 44, 0x1a6b1a)
        .setScrollFactor(0).setDepth(29).setInteractive();
      overlay.push(btn);
      overlay.push(
        this.add.text(W / 2, H / 2 + 90, 'Lobiye Dön', {
          fontSize: '18px', fill: '#7fff7f', fontFamily: 'monospace'
        }).setScrollFactor(0).setOrigin(0.5).setDepth(30)
      );
      btn.on('pointerdown', () => this._returnToLobby());
    }
  }

  _showGameEndScreen(isWinner, winnerUsername, _rank, total) {
    this._spectatorMode = false;
    this.events.emit('spectator_mode_changed', false);
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75)
      .setScrollFactor(0).setDepth(30);

    if (isWinner) {
      this.add.text(W / 2, H / 2 - 70, 'KAZANDIN!', {
        fontSize: '52px', fill: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4
      }).setScrollFactor(0).setOrigin(0.5).setDepth(31);
      this.add.text(W / 2, H / 2 - 10, '#1', {
        fontSize: '42px', fill: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold'
      }).setScrollFactor(0).setOrigin(0.5).setDepth(31);
      if (total != null) {
        this.add.text(W / 2, H / 2 + 34, `${total} kişi arasında`, {
          fontSize: '16px', fill: '#aaaaaa', fontFamily: 'monospace'
        }).setScrollFactor(0).setOrigin(0.5).setDepth(31);
      }
    } else {
      this.add.text(W / 2, H / 2 - 70, 'OYUN BİTTİ', {
        fontSize: '44px', fill: '#f44336', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4
      }).setScrollFactor(0).setOrigin(0.5).setDepth(31);
      const winner = winnerUsername || 'Bilinmiyor';
      this.add.text(W / 2, H / 2 - 10, `Kazanan: ${winner}`, {
        fontSize: '22px', fill: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold'
      }).setScrollFactor(0).setOrigin(0.5).setDepth(31);
    }

    const btn = this.add.rectangle(W / 2, H / 2 + 100, 200, 48, isWinner ? 0x1a6b1a : 0x333333)
      .setScrollFactor(0).setDepth(31).setInteractive();
    this.add.text(W / 2, H / 2 + 100, 'Lobiye Dön', {
      fontSize: '20px', fill: isWinner ? '#7fff7f' : '#aaaaaa', fontFamily: 'monospace'
    }).setScrollFactor(0).setOrigin(0.5).setDepth(32);

    btn.on('pointerdown', () => this._returnToLobby());
  }

  _returnToLobby() {
    this.weapon.disableZoom();
    this.propSystem?.clearAllRespawnTimers();
    this.network.destroy();
    this.scene.stop('HUDScene');
    this.scene.start('LobbyScene');
  }
}
