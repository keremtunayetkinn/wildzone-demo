const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameRoom = require('./GameRoom');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const room = new GameRoom();

app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('player:join', (data) => {
    if (!room.canJoin()) {
      socket.emit('room:full');
      return;
    }

    const player = room.addPlayer(socket.id, data || {});

    // Send current player list to the joining player
    socket.emit('player:joined', {
      me: player,
      players: room.getAllPlayers().filter(p => p.socketId !== socket.id)
    });

    // Notify others about the new player
    socket.broadcast.emit('player:new', player);

    console.log(`Player joined: ${player.username} (${player.id})`);
  });

  socket.on('player:move', (data) => {
    if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;
    const updated = room.updatePosition(socket.id, data.x, data.y, data.rotation);
    if (updated) {
      const player = room.getPlayer(socket.id);
      socket.broadcast.emit('player:moved', {
        id: player.id,
        x: player.x,
        y: player.y,
        rotation: player.rotation
      });
    }
  });

  socket.on('player:shoot', (data) => {
    if (!data || typeof data.targetX !== 'number' || typeof data.targetY !== 'number') return;
    const shooter = room.getPlayer(socket.id);
    if (!shooter || !shooter.alive) return;
    if (!room.canShoot(socket.id)) return; // Rate limit

    socket.broadcast.emit('player:shot', {
      shooterId: shooter.id,
      x: shooter.x,
      y: shooter.y,
      targetX: data.targetX,
      targetY: data.targetY
    });
  });

  socket.on('player:hit', (data) => {
    // data: { targetId: socketId }
    if (!data || typeof data.targetSocketId !== 'string') return;
    const shooter = room.getPlayer(socket.id);
    if (!shooter || !shooter.alive) return;

    const result = room.applyDamage(data.targetSocketId, socket.id);
    if (!result) return;

    const target = room.getPlayer(data.targetSocketId);
    if (!target) return;

    // Notify target of damage
    io.to(data.targetSocketId).emit('player:hit', {
      hp: result.hp,
      armor: result.armor,
      shooterId: shooter.id
    });

    if (result.died) {
      io.emit('player:died', {
        id: target.id,
        killerId: shooter.id
      });
      console.log(`Player died: ${target.username}`);

      // Kazanan kontrolü
      const aliveCount = room.getAliveCount();
      if (aliveCount <= 1) {
        const winner = room.getAlivePlayer();
        io.emit('game:winner', winner
          ? { id: winner.id, username: winner.username }
          : { id: null, username: null }
        );
        if (winner) console.log(`Winner: ${winner.username}`);
      }
    }
  });

  socket.on('player:equip_armor', (data) => {
    if (!data || typeof data.armorId !== 'string') return;
    room.equipArmor(socket.id, data.armorId);
  });

  socket.on('disconnect', () => {
    const player = room.getPlayer(socket.id);
    if (player) {
      socket.broadcast.emit('player:disconnect', { id: player.id });
      room.removePlayer(socket.id);
      console.log(`Player disconnected: ${player.username}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`WildZone server running at http://localhost:${PORT}`);
});
