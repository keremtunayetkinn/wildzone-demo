const { v4: uuidv4 } = require('uuid');
const CONSTANTS = require('./constants');

const ARMOR_DATA = {
  armor_1: { level: 1, maxDurability: 50  },
  armor_2: { level: 2, maxDurability: 75  },
  armor_3: { level: 3, maxDurability: 100 }
};

class GameRoom {
  constructor() {
    this.players = new Map();
    this.shootCooldowns = new Map();
    this.moveCooldowns = new Map();
    this.pendingHits = new Set(); // player:shoot çağrılan ama henüz player:hit gelmeyen oyuncular
  }

  canJoin() {
    return this.players.size < CONSTANTS.MAX_PLAYERS;
  }

  addPlayer(socketId, data) {
    const username = this._sanitizeUsername(data.username);
    const character = CONSTANTS.CHARACTERS.includes(data.character) ? data.character : 'char_1';
    const accessory = (data.accessory === null || CONSTANTS.ACCESSORIES.includes(data.accessory)) ? data.accessory : null;

    const player = {
      id: uuidv4(),
      socketId,
      username,
      character,
      accessory,
      x: Math.floor(Math.random() * (CONSTANTS.MAP_WIDTH - 400)) + 200,
      y: Math.floor(Math.random() * (CONSTANTS.MAP_HEIGHT - 400)) + 200,
      rotation: 0,
      hp: CONSTANTS.PLAYER_HP,
      armor: null,
      alive: true,
      lastDamageTime: 0
    };

    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.shootCooldowns.delete(socketId);
    this.moveCooldowns.delete(socketId);
    this.pendingHits.delete(socketId);
  }

  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  getPlayerCount() {
    return this.players.size;
  }

  updatePosition(socketId, x, y, rotation) {
    const now = Date.now();
    const lastMove = this.moveCooldowns.get(socketId) || 0;
    if (now - lastMove < CONSTANTS.NETWORK_THROTTLE - 5) return false;

    const player = this.players.get(socketId);
    if (!player || !player.alive) return false;

    // Hız kontrolü: ağ gecikmesine 2.5x tolerans tanıyarak teleport'u reddet
    if (lastMove > 0) {
      const elapsed = (now - lastMove) / 1000;
      const maxDist = CONSTANTS.PLAYER_SPEED * 2.5 * elapsed;
      const dx = (Number(x) || player.x) - player.x;
      const dy = (Number(y) || player.y) - player.y;
      if (Math.sqrt(dx * dx + dy * dy) > maxDist) return false;
    }

    // Clamp coordinates to map bounds
    player.x = Math.max(0, Math.min(CONSTANTS.MAP_WIDTH, Number(x) || player.x));
    player.y = Math.max(0, Math.min(CONSTANTS.MAP_HEIGHT, Number(y) || player.y));
    player.rotation = Number(rotation) || 0;

    this.moveCooldowns.set(socketId, now);
    return true;
  }

  canShoot(socketId) {
    const now = Date.now();
    const last = this.shootCooldowns.get(socketId) || 0;
    if (now - last < CONSTANTS.PISTOL_COOLDOWN) return false;
    this.shootCooldowns.set(socketId, now);
    this.pendingHits.add(socketId); // atış kaydedildi, isabet bekleniyor
    return true;
  }

  getPlayerByUUID(id) {
    for (const player of this.players.values()) {
      if (player.id === id) return player;
    }
    return null;
  }

  getAliveCount() {
    let count = 0;
    for (const p of this.players.values()) {
      if (p.alive) count++;
    }
    return count;
  }

  equipArmor(socketId, armorId) {
    const player = this.players.get(socketId);
    if (!player || !player.alive) return false;
    const data = ARMOR_DATA[armorId];
    if (!data) return false;
    if (player.armor && player.armor.level >= data.level) return false;
    player.armor = { ...data, durability: data.maxDurability };
    return true;
  }

  getAlivePlayer() {
    for (const p of this.players.values()) {
      if (p.alive) return p;
    }
    return null;
  }

  applyDamage(targetId, shooterSocketId) {
    // player:shoot çağrılmadan gelen player:hit event'lerini reddet
    if (!this.pendingHits.has(shooterSocketId)) return null;
    this.pendingHits.delete(shooterSocketId);

    // targetId socket ID veya UUID olabilir — ikisini de dene
    const target = this.players.get(targetId) || this.getPlayerByUUID(targetId);
    const shooter = this.players.get(shooterSocketId);
    if (!target || !target.alive || !shooter || !shooter.alive) return null;

    // Sunucu taraflı mesafe kontrolü — mesafesiz hasar hilesini engeller
    const dx = target.x - shooter.x;
    const dy = target.y - shooter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > CONSTANTS.PISTOL_RANGE * 1.5) return null; // %50 gecikme toleransı

    target.lastDamageTime = Date.now();

    let damage = CONSTANTS.PISTOL_DAMAGE;
    if (target.armor) {
      target.armor.durability -= damage;
      if (target.armor.durability <= 0) {
        // Zırh kırıldı, taşan hasar cana gider
        damage = -target.armor.durability;
        target.armor = null;
        target.hp = Math.max(0, target.hp - damage);
      }
      // else: zırh hasarı tamamen emdi, can değişmez
    } else {
      target.hp = Math.max(0, target.hp - damage);
    }
    const died = target.hp <= 0;
    if (died) target.alive = false;

    const armorState = target.armor
      ? { durability: target.armor.durability, maxDurability: target.armor.maxDurability }
      : null;
    return { hp: target.hp, died, targetSocketId: target.socketId, armor: armorState };
  }

  _sanitizeUsername(username) {
    if (typeof username !== 'string') return 'Player';
    // Strip non-alphanumeric except spaces/underscores, limit length
    return username.replace(/[^a-zA-Z0-9_\s]/g, '').trim().slice(0, 16) || 'Player';
  }
}

module.exports = GameRoom;
