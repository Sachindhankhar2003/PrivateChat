const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ── In-memory state ───────────────────────────────────────────────────────────
// rooms: Map<roomId, Map<socketId, { username }>>
const rooms = new Map();

// ── REST: generate a new room ID ──────────────────────────────────────────────
app.get('/api/create-room', (_req, res) => {
  const roomId = crypto.randomBytes(5).toString('hex'); // 10-char hex e.g. "a3f9c12b4e"
  res.json({ roomId });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function getRoomUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values()).map((u) => u.username);
}

function broadcastRoomUsers(roomId) {
  io.to(roomId).emit('room:users', getRoomUsers(roomId));
}

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUsername = null;

  // ── Join a room ─────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomId, username }) => {
    const trimmedRoom = (roomId || '').trim();
    const trimmedName = (username || '').trim().slice(0, 30);

    if (!trimmedRoom || trimmedName.length < 2) {
      socket.emit('error', 'Invalid room or username');
      return;
    }

    // Leave any previous room first
    if (currentRoom) {
      leaveRoom(socket, currentRoom, currentUsername);
    }

    currentRoom = trimmedRoom;
    currentUsername = trimmedName;

    // Ensure room map exists
    if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Map());
    rooms.get(currentRoom).set(socket.id, { username: currentUsername });

    socket.join(currentRoom);

    // Confirm to joiner
    socket.emit('room:joined', { roomId: currentRoom, username: currentUsername });

    // Notify others in the room
    socket.to(currentRoom).emit('message:system', {
      id: `sys-${Date.now()}`,
      text: `${currentUsername} joined the room`,
      type: 'join',
      timestamp: new Date().toISOString(),
    });

    broadcastRoomUsers(currentRoom);
    console.log(`[${currentRoom}] ${currentUsername} joined (${socket.id})`);
  });

  // ── Send a message ──────────────────────────────────────────────────────────
  socket.on('message:send', (text) => {
    if (!currentRoom || !currentUsername) return;
    const trimmed = (text || '').trim().slice(0, 1000);
    if (!trimmed) return;

    const msg = {
      id: `${socket.id}-${Date.now()}`,
      username: currentUsername,
      socketId: socket.id,
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    // Broadcast ONLY to this room
    io.to(currentRoom).emit('message:receive', msg);

    // Clear typing
    socket.to(currentRoom).emit('typing:update', getTypingUsers(currentRoom, socket.id, false));
  });

  // ── Typing indicators ───────────────────────────────────────────────────────
  const typingRooms = new Map(); // roomId -> Set<socketId>

  function getTypingUsers(roomId, excludeSocketId = null, adding = true) {
    if (!typingRooms.has(roomId)) typingRooms.set(roomId, new Set());
    const set = typingRooms.get(roomId);
    if (excludeSocketId) {
      if (adding) set.add(excludeSocketId);
      else set.delete(excludeSocketId);
    }
    const room = rooms.get(roomId);
    if (!room) return [];
    return Array.from(set)
      .filter((sid) => room.has(sid))
      .map((sid) => room.get(sid).username);
  }

  socket.on('typing:start', () => {
    if (!currentRoom) return;
    const users = getTypingUsers(currentRoom, socket.id, true);
    io.to(currentRoom).emit('typing:update', users);
  });

  socket.on('typing:stop', () => {
    if (!currentRoom) return;
    const users = getTypingUsers(currentRoom, socket.id, false);
    io.to(currentRoom).emit('typing:update', users);
  });

  // ── Leave room ──────────────────────────────────────────────────────────────
  function leaveRoom(sock, roomId, username) {
    sock.leave(roomId);
    const room = rooms.get(roomId);
    if (room) {
      room.delete(sock.id);
      if (room.size === 0) {
        rooms.delete(roomId); // GC empty rooms
        console.log(`[${roomId}] Room deleted (empty)`);
      } else {
        io.to(roomId).emit('message:system', {
          id: `sys-${Date.now()}`,
          text: `${username} left the room`,
          type: 'leave',
          timestamp: new Date().toISOString(),
        });
        broadcastRoomUsers(roomId);
      }
    }
    // Clean typing state
    if (typingRooms.has(roomId)) {
      typingRooms.get(roomId).delete(sock.id);
      io.to(roomId).emit('typing:update', getTypingUsers(roomId));
    }
    console.log(`[${roomId}] ${username} left (${sock.id})`);
  }

  socket.on('room:leave', () => {
    if (currentRoom && currentUsername) {
      leaveRoom(socket, currentRoom, currentUsername);
      currentRoom = null;
      currentUsername = null;
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom && currentUsername) {
      leaveRoom(socket, currentRoom, currentUsername);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});
