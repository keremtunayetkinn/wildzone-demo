let instance = null;

export default class NetworkSystem {
  constructor(scene) {
    if (instance) {
      instance.scene = scene;
      return instance;
    }
    this.scene = scene;
    this.socket = io();
    this._lastSendTime = 0;
    this._listeners = [];
    instance = this;
  }

  static getInstance(scene) {
    if (!instance) new NetworkSystem(scene);
    else if (scene) instance.scene = scene;
    return instance;
  }

  // --- Send ---

  sendJoin(playerData) {
    this.socket.emit('player:join', playerData);
  }

  sendMove(x, y, rotation) {
    const now = Date.now();
    if (now - this._lastSendTime < 50) return;
    this._lastSendTime = now;
    this.socket.emit('player:move', { x, y, rotation });
  }

  sendShoot(targetX, targetY) {
    this.socket.emit('player:shoot', { targetX, targetY });
  }

  sendHit(targetSocketId) {
    this.socket.emit('player:hit', { targetSocketId });
  }

  sendPickupArmor(armorId) {
    this.socket.emit('player:pickup_armor', { armorId });
  }

  sendEquipArmor(armorId) {
    this.socket.emit('player:equip_armor', { armorId });
  }

  // --- Listen ---

  onPlayerJoined(callback) { this._on('player:joined', callback); }
  onPlayerNew(callback)    { this._on('player:new', callback); }
  onPlayerMoved(callback)  { this._on('player:moved', callback); }
  onPlayerShot(callback)   { this._on('player:shot', callback); }
  onPlayerHit(callback)    { this._on('player:hit', callback); }
  onPlayerDied(callback)   { this._on('player:died', callback); }
  onPlayerDisconnect(callback) { this._on('player:disconnect', callback); }
  onRoomFull(callback)     { this._on('room:full', callback); }
  onGameWinner(callback)   { this._on('game:winner', callback); }

  _on(event, callback) {
    this.socket.off(event); // prevent duplicate listeners
    this.socket.on(event, callback);
  }

  getSocketId() {
    return this.socket.id;
  }

  destroy() {
    this.socket.disconnect();
    instance = null;
  }
}
