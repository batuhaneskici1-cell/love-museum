const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static('public'));

// Rooms storage
const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create room
  socket.on('create_room', () => {
    const roomCode = generateRoomCode();
    
    rooms.set(roomCode, {
      host: socket.id,
      guest: null,
      hostPosition: { x: 0, y: 0, z: 55 },
      guestPosition: { x: 3, y: 0, z: 55 },
      hostRotation: 0,
      guestRotation: 0
    });

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isHost = true;

    socket.emit('room_created', { 
      roomCode, 
      isHost: true,
      position: { x: 0, y: 0, z: 55 }
    });

    console.log(`Room created: ${roomCode} by ${socket.id}`);
  });

  // Join room
  socket.on('join_room', (roomCode) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Oda bulunamadı!' });
      return;
    }

    if (room.guest && room.guest !== socket.id) {
      socket.emit('error', { message: 'Oda dolu!' });
      return;
    }

    // Allow rejoining
    if (room.guest === socket.id) {
      socket.join(roomCode);
      socket.emit('room_joined', { 
        roomCode, 
        isHost: false,
        position: { x: 3, y: 0, z: 55 }
      });
      return;
    }

    room.guest = socket.id;
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isHost = false;

    // Tell guest they joined
    socket.emit('room_joined', { 
      roomCode, 
      isHost: false,
      position: { x: 3, y: 0, z: 55 }
    });

    // Tell host that guest joined
    io.to(room.host).emit('partner_joined', {
      partnerId: socket.id
    });

    console.log(`${socket.id} joined room ${roomCode}`);
  });

  // Update position
  socket.on('update_position', (data) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    if (socket.isHost) {
      room.hostPosition = data.position;
      room.hostRotation = data.rotation;
      room.hostAnimation = data.animation;
      room.hostDanceNumber = data.danceNumber;
      // Send to guest
      if (room.guest) {
        io.to(room.guest).emit('partner_moved', {
          position: data.position,
          rotation: data.rotation,
          animation: data.animation,
          danceNumber: data.danceNumber
        });
      }
    } else {
      room.guestPosition = data.position;
      room.guestRotation = data.rotation;
      room.guestAnimation = data.animation;
      room.guestDanceNumber = data.danceNumber;
      // Send to host
      io.to(room.host).emit('partner_moved', {
        position: data.position,
        rotation: data.rotation,
        animation: data.animation,
        danceNumber: data.danceNumber
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    if (socket.roomCode) {
      const room = rooms.get(socket.roomCode);
      if (room) {
        // Notify partner
        const partnerId = socket.isHost ? room.guest : room.host;
        if (partnerId) {
          io.to(partnerId).emit('partner_disconnected');
        }

        // If host leaves, delete room
        if (socket.isHost) {
          rooms.delete(socket.roomCode);
          console.log(`Room ${socket.roomCode} deleted`);
        } else {
          room.guest = null;
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Multiplayer server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});
