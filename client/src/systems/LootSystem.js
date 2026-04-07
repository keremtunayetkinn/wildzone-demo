// wildzone/client/src/systems/LootSystem.js
import LootDrop from '../entities/LootDrop.js';
import { WEAPONS } from '../constants/weapons.js';

const MAP_W = 6000;
const MAP_H = 6000;
const MAP_MARGIN = 150;
const PICKUP_RANGE = 50;
const PROXIMITY_FRAMES = 8; // check every N frames

// ── Olasılık tabanlı loot sistemi ──────────────────────────────────────
const TOTAL_SPAWN_POINTS = 120;  // haritadaki toplam spawn noktası
const SPAWN_CHANCE       = 0.85; // her noktanın item içerme olasılığı

// Nadirlik ağırlıkları — düşük = daha nadir
const RARITY_WEIGHTS = { common: 10, uncommon: 5, rare: 2 };

// Kategori ağırlıkları — spawn noktası önce kategori seçer, sonra item
const CATEGORY_WEIGHTS = { weapon: 50, ammo: 35, armor: 15 };

// Loot havuzu (count yok — ağırlık nadirlikten hesaplanır)
const LOOT_POOL = {
  weapon: [
    { type: 'weapon',  id: 'pistol',  rarity: 'common'   },
    { type: 'weapon',  id: 'shotgun', rarity: 'uncommon' },
    { type: 'weapon',  id: 'smg',     rarity: 'uncommon' },
    { type: 'weapon',  id: 'sniper',  rarity: 'rare'     },
    { type: 'weapon',  id: 'bazooka', rarity: 'rare'     },
    { type: 'weapon',  id: 'harpoon', rarity: 'uncommon' },
    { type: 'utility', id: 'bush',    rarity: 'uncommon' },
    { type: 'melee',   id: 'sword',   rarity: 'common'   },
    { type: 'melee',   id: 'pickaxe', rarity: 'uncommon' },
    { type: 'melee',   id: 'axe',     rarity: 'rare'     },
  ],
  ammo: [
    { type: 'ammo', id: 'ammo_pistol',  quantity: 30, rarity: 'common'   },
    { type: 'ammo', id: 'ammo_shotgun', quantity: 10, rarity: 'uncommon' },
    { type: 'ammo', id: 'ammo_smg',     quantity: 60, rarity: 'common'   },
    { type: 'ammo', id: 'ammo_sniper',  quantity: 5,  rarity: 'rare'     },
    { type: 'ammo', id: 'ammo_bazooka', quantity: 2,  rarity: 'rare'     },
    { type: 'ammo', id: 'ammo_harpoon', quantity: 3,  rarity: 'uncommon' },
  ],
  armor: [
    { type: 'armor', id: 'armor_1', rarity: 'common'   },
    { type: 'armor', id: 'armor_2', rarity: 'uncommon' },
    { type: 'armor', id: 'armor_3', rarity: 'rare'     },
  ],
};

const LOOT_NAMES = {
  pistol: 'Tabanca', shotgun: 'Pompalı', smg: 'Makineli',
  sniper: 'Sniper', bazooka: 'Bazuka', harpoon: 'Zıpkın', bush: 'Çalı Kamuflajı',
  sword: 'Kılıç', pickaxe: 'Kazma', axe: 'Balta',
  ammo_pistol: 'Tabanca Mermisi', ammo_shotgun: 'Pompalı Fişeği',
  ammo_smg: 'Makineli Mermisi', ammo_sniper: 'Sniper Mermisi', ammo_bazooka: 'Bazuka Roketi', ammo_harpoon: 'Zıpkın Oku',
  armor_1: 'Hafif Yelek', armor_2: 'Taktik Yelek', armor_3: 'Ağır Zırh',
  wood: 'Ahşap', stone: 'Taş', metal: 'Metal'
};

export default class LootSystem {
  constructor(scene) {
    this.scene = scene;
    this.lootDrops = [];
    this.nearestLoot = null;
    this.promptText = null;
    this._frame = 0;

    this.pickupKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  spawnInitialLoot() {
    const rng = new Phaser.Math.RandomDataGenerator([`wz_${Date.now()}`]);
    const points = this._generateSpawnPoints(TOTAL_SPAWN_POINTS, 80, rng);

    // Kategori ağırlık toplamı (weighted random için)
    const catEntries = Object.entries(CATEGORY_WEIGHTS);
    const catTotal = catEntries.reduce((s, [, w]) => s + w, 0);

    // Rare silahların her birinden en az 1 tane garantile
    const guaranteedRare = ['axe', 'sniper', 'bazooka'];
    for (const rareId of guaranteedRare) {
      const pt = points[rng.integerInRange(0, points.length - 1)];
      const entry = LOOT_POOL.weapon.find(e => e.id === rareId);
      const drop = new LootDrop(this.scene, pt.x, pt.y,
        { type: entry.type, id: entry.id, quantity: 1, rarity: entry.rarity });
      drop.setDepth(1.5);
      this.lootDrops.push(drop);
    }

    for (const pt of points) {
      // Her spawn noktası SPAWN_CHANCE olasılıkla item içerir
      if (rng.frac() > SPAWN_CHANCE) continue;

      // 1) Kategori seç (weapon / ammo / armor)
      const catRoll = rng.frac() * catTotal;
      let cumulative = 0;
      let category = catEntries[0][0];
      for (const [cat, w] of catEntries) {
        cumulative += w;
        if (catRoll < cumulative) { category = cat; break; }
      }

      // 2) Kategori içinden nadirlik ağırlığına göre item seç
      const pool = LOOT_POOL[category];
      const weights = pool.map(e => RARITY_WEIGHTS[e.rarity]);
      const poolTotal = weights.reduce((s, w) => s + w, 0);
      const itemRoll = rng.frac() * poolTotal;
      let acc = 0;
      let picked = pool[0];
      for (let i = 0; i < pool.length; i++) {
        acc += weights[i];
        if (itemRoll < acc) { picked = pool[i]; break; }
      }

      const item = {
        type: picked.type,
        id: picked.id,
        quantity: picked.quantity || 1,
        rarity: picked.rarity
      };

      const drop = new LootDrop(this.scene, pt.x, pt.y, item);
      drop.setDepth(1.5);
      this.lootDrops.push(drop);
    }
  }

  _generateSpawnPoints(count, minDist, rng) {
    const points = [];
    const MAX_ATTEMPTS = 40;

    for (let i = 0; i < count; i++) {
      let placed = false;

      for (let a = 0; a < MAX_ATTEMPTS; a++) {
        // Distribute across 4 map quadrants
        const quadrant = i % 4;
        const halfW = MAP_W / 2;
        const halfH = MAP_H / 2;
        const qx = (quadrant % 2) * halfW;
        const qy = Math.floor(quadrant / 2) * halfH;

        const x = rng.integerInRange(qx + MAP_MARGIN, qx + halfW - MAP_MARGIN);
        const y = rng.integerInRange(qy + MAP_MARGIN, qy + halfH - MAP_MARGIN);

        let tooClose = false;
        for (const p of points) {
          const dx = p.x - x;
          const dy = p.y - y;
          if (dx * dx + dy * dy < minDist * minDist) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          points.push({ x, y });
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Fallback placement
        points.push({
          x: rng.integerInRange(MAP_MARGIN, MAP_W - MAP_MARGIN),
          y: rng.integerInRange(MAP_MARGIN, MAP_H - MAP_MARGIN)
        });
      }
    }

    return points;
  }

  update(player) {
    if (!player || !player.alive) return;

    this._frame++;

    // E key pickup (every frame)
    if (Phaser.Input.Keyboard.JustDown(this.pickupKey) && this.nearestLoot) {
      this._collectLoot(player, this.nearestLoot);
      return;
    }

    // Proximity check every N frames
    if (this._frame % PROXIMITY_FRAMES !== 0) return;

    const px = player.sprite.x;
    const py = player.sprite.y;
    let nearest = null;
    let nearestDist = PICKUP_RANGE + 1;

    for (const drop of this.lootDrops) {
      if (!drop.active) continue;
      const dx = drop.x - px;
      const dy = drop.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearest = drop;
        nearestDist = dist;
      }
    }

    if (nearest !== this.nearestLoot) {
      if (this.nearestLoot) this.nearestLoot.onPlayerNearby(false);
      this.nearestLoot = nearest;
      if (nearest) nearest.onPlayerNearby(true);
    }

    this._updatePrompt(nearest, player);
  }

  _updatePrompt(loot, _player) {
    if (!loot) {
      if (this.promptText) this.promptText.setVisible(false);
      return;
    }

    if (!this.promptText) {
      this.promptText = this.scene.add.text(0, 0, '', {
        fontSize: '12px',
        fill: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#000000bb',
        padding: { x: 5, y: 3 }
      }).setDepth(12).setScrollFactor(0);
    }

    const name = this._getLootName(loot.itemData);
    this.promptText.setText(`[E]  ${name}`);
    this.promptText.setVisible(true);

    const cam = this.scene.cameras.main;
    const sx = (loot.x - cam.scrollX) - this.promptText.width / 2;
    const sy = (loot.y - cam.scrollY) - 32;
    this.promptText.setPosition(sx, sy);
  }

  _getLootName(itemData) {
    const base = LOOT_NAMES[itemData.id] || itemData.id;
    if (itemData.type === 'ammo' || itemData.type === 'resource') return `${itemData.quantity}x ${base}`;
    return base;
  }

  _collectLoot(player, lootDrop) {
    if (!lootDrop || !lootDrop.active) return;

    const { type, id, quantity } = lootDrop.itemData;
    let collected = false;
    let message = '';

    if (type === 'weapon' || type === 'utility' || type === 'melee') {
      const preloadedMag = lootDrop.itemData.magazineAmmo ?? null;
      let slot = player.inventory.addWeapon(id, preloadedMag);

      if (slot === false) {
        // Slotlar dolu — aktif slottaki silahı yere bırak, yenisini al
        const weaponData = WEAPONS[id];
        let swapSlot;
        if (weaponData?.type === 'melee') {
          swapSlot = 2;
        } else {
          swapSlot = player.inventory.activeSlot <= 1 ? player.inventory.activeSlot : 0;
        }
        const droppedId = player.inventory.weapons[swapSlot];
        this._dropWeaponToGround(player, swapSlot, lootDrop.x, lootDrop.y);
        slot = player.inventory.addWeapon(id, preloadedMag);
        if (slot !== false && droppedId) {
          message = `+${LOOT_NAMES[id] || id}  ↔  -${LOOT_NAMES[droppedId] || droppedId}`;
        }
      } else {
        message = `+${LOOT_NAMES[id] || id}`;
      }

      if (slot !== false) {
        collected = true;
      }
    } else if (type === 'ammo') {
      // Oyuncunun bu mermiyi kullanan silaha sahip olması gerekiyor
      const requiredWeapon = Object.entries(WEAPONS).find(([, w]) => w.ammoType === id)?.[0];
      if (requiredWeapon && !player.inventory.weapons.includes(requiredWeapon)) {
        this._showPickupMessage('Önce silahı al!', lootDrop.x, lootDrop.y, '#ff6666');
        return;
      }
      player.inventory.addAmmo(id, quantity);
      collected = true;
      message = `+${quantity} ${LOOT_NAMES[id] || id}`;
    } else if (type === 'armor') {
      const equipped = player.armorSystem.equipArmor(id);
      if (equipped) {
        this.scene.network?.sendEquipArmor(id);
        collected = true;
        message = `+${LOOT_NAMES[id] || id}`;
      } else {
        this._showPickupMessage('Daha iyi zırh kuşanılı', lootDrop.x, lootDrop.y, '#ffaa44');
        return;
      }
    } else if (type === 'resource') {
      player.resources.add(id, quantity);
      this.scene.events.emit('resource_changed', player.resources.getAll());
      collected = true;
      message = `+${quantity} ${LOOT_NAMES[id] || id}`;
    }

    if (collected) {
      this._showPickupMessage(message, lootDrop.x, lootDrop.y, '#7fff7f');

      const idx = this.lootDrops.indexOf(lootDrop);
      if (idx !== -1) this.lootDrops.splice(idx, 1);

      lootDrop.destroy();
      this.nearestLoot = null;
      if (this.promptText) this.promptText.setVisible(false);

      this.scene.events.emit('inventory_changed');
    }
  }

  _showPickupMessage(text, worldX, worldY, color = '#7fff7f') {
    const cam = this.scene.cameras.main;
    const sx = worldX - cam.scrollX;
    const sy = worldY - cam.scrollY;

    const msg = this.scene.add.text(sx, sy - 10, text, {
      fontSize: '13px',
      fill: color,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(15).setOrigin(0.5);

    this.scene.tweens.add({
      targets: msg,
      y: sy - 50,
      alpha: 0,
      duration: 1300,
      onComplete: () => msg.destroy()
    });
  }

  dropWeapon(player, slot) {
    const weaponId = player.inventory.weapons[slot];
    if (!weaponId) return; // slot boş veya yumruk

    const weaponData = WEAPONS[weaponId];
    const currentMag = player.inventory.magazineAmmo[slot] ?? 0;
    const itemData = {
      type: weaponData.type === 'utility' ? 'utility' : weaponData.type === 'melee' ? 'melee' : 'weapon',
      id: weaponId,
      quantity: 1,
      rarity: weaponData.rarity || 'common',
      magazineAmmo: currentMag
    };

    // Kamuflaj silahı bırakılırsa camo bozulur
    if (weaponId === 'bush' && player.isCamouflaged) {
      player.deactivateCamouflage();
    }

    player.inventory.removeWeapon(slot);

    // Aktif slot boşaldıysa geçiş yap
    if (player.inventory.activeSlot === slot) {
      if (slot === 2) {
        // Melee slot bırakıldı — ateşli slota geç, yoksa 2'de kal (yumruk)
        player.inventory.activeSlot =
          player.inventory.weapons[0] ? 0 :
          player.inventory.weapons[1] ? 1 : 2;
      } else {
        const other = slot === 0 ? 1 : 0;
        player.inventory.activeSlot =
          player.inventory.weapons[other] ? other : 2; // yumruğa düş
      }
    }

    const x = player.sprite.x + Phaser.Math.Between(-20, 20);
    const y = player.sprite.y + Phaser.Math.Between(-20, 20);
    const drop = new LootDrop(this.scene, x, y, itemData);
    drop.setDepth(1.5);
    this.lootDrops.push(drop);

    this.scene.events.emit('inventory_changed');
  }

  // Belirtilen world konumuna silahı bırakır (swap için)
  _dropWeaponToGround(player, slot, x, y) {
    const weaponId = player.inventory.weapons[slot];
    if (!weaponId) return;

    const weaponData = WEAPONS[weaponId];
    const currentMag = player.inventory.magazineAmmo[slot] ?? 0;

    if (weaponId === 'bush' && player.isCamouflaged) {
      player.deactivateCamouflage();
    }

    player.inventory.removeWeapon(slot);

    if (player.inventory.activeSlot === slot) {
      if (slot === 2) {
        player.inventory.activeSlot =
          player.inventory.weapons[0] ? 0 :
          player.inventory.weapons[1] ? 1 : 2;
      } else {
        const other = slot === 0 ? 1 : 0;
        player.inventory.activeSlot =
          player.inventory.weapons[other] ? other : 2;
      }
    }

    const itemData = {
      type: weaponData.type === 'utility' ? 'utility' : weaponData.type === 'melee' ? 'melee' : 'weapon',
      id: weaponId,
      quantity: 1,
      rarity: weaponData.rarity || 'common',
      magazineAmmo: currentMag
    };

    const drop = new LootDrop(this.scene, x, y, itemData);
    drop.setDepth(1.5);
    this.lootDrops.push(drop);
  }

  dropLootFromBot(position) {
    const rng = new Phaser.Math.RandomDataGenerator([`bot_${Date.now()}`]);
    const items = [];

    const weapons = ['pistol', 'shotgun', 'smg'];
    const wId = weapons[rng.integerInRange(0, weapons.length - 1)];
    items.push({ type: 'weapon', id: wId, quantity: 1, rarity: 'common' });

    const ammoMap = { pistol: 'ammo_pistol', shotgun: 'ammo_shotgun', smg: 'ammo_smg' };
    items.push({ type: 'ammo', id: ammoMap[wId], quantity: 15, rarity: 'common' });

    if (rng.frac() < 0.3) {
      items.push({ type: 'armor', id: 'armor_1', quantity: 1, rarity: 'common' });
    }

    items.forEach(item => {
      const x = position.x + rng.integerInRange(-25, 25);
      const y = position.y + rng.integerInRange(-25, 25);
      const drop = new LootDrop(this.scene, x, y, item);
      drop.setDepth(1.5);
      this.lootDrops.push(drop);
    });
  }

  dropPlayerLoot(player) {
    const x = player.sprite.x;
    const y = player.sprite.y;

    // Drop all weapon slots (includes magazine ammo in itemData)
    for (let slot = 0; slot <= 2; slot++) {
      const weaponId = player.inventory.weapons[slot];
      if (!weaponId) continue;

      const weaponData = WEAPONS[weaponId];
      const currentMag = player.inventory.magazineAmmo[slot] ?? 0;
      const itemData = {
        type: weaponData.type === 'utility' ? 'utility' : weaponData.type === 'melee' ? 'melee' : 'weapon',
        id: weaponId,
        quantity: 1,
        rarity: weaponData.rarity || 'common',
        magazineAmmo: currentMag
      };

      if (weaponId === 'bush' && player.isCamouflaged) {
        player.deactivateCamouflage();
      }

      const dx = Phaser.Math.Between(-35, 35);
      const dy = Phaser.Math.Between(-35, 35);
      const drop = new LootDrop(this.scene, x + dx, y + dy, itemData);
      drop.setDepth(1.5);
      this.lootDrops.push(drop);
    }

    // Drop inventory ammo (reserve — not magazine)
    for (const [ammoType, quantity] of Object.entries(player.inventory.ammo)) {
      if (quantity <= 0) continue;
      const itemData = { type: 'ammo', id: ammoType, quantity, rarity: 'common' };
      const dx = Phaser.Math.Between(-35, 35);
      const dy = Phaser.Math.Between(-35, 35);
      const drop = new LootDrop(this.scene, x + dx, y + dy, itemData);
      drop.setDepth(1.5);
      this.lootDrops.push(drop);
    }

    // Drop resources
    const resources = player.resources.getAll();
    for (const [resType, amount] of Object.entries(resources)) {
      if (amount <= 0) continue;
      const itemData = { type: 'resource', id: resType, quantity: amount, rarity: 'common' };
      const dx = Phaser.Math.Between(-35, 35);
      const dy = Phaser.Math.Between(-35, 35);
      const drop = new LootDrop(this.scene, x + dx, y + dy, itemData);
      drop.setDepth(1.5);
      this.lootDrops.push(drop);
    }
  }

  createDrop(x, y, itemData) {
    const drop = new LootDrop(this.scene, x, y, itemData);
    drop.setDepth(1.5);
    this.lootDrops.push(drop);
    return drop;
  }

  getActiveLootDrops() {
    return this.lootDrops.filter(d => d.active);
  }
}
