const ROOM_ID = 'p2-transfer-room-hub';
const ROOM_PREFIX = 'room:';
const ROOM_GRACE_MS = 5 * 60 * 1000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*'
    }
  });
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({ ok: true });
    }

    if (url.pathname !== '/signal') {
      return json({ error: 'not_found' }, 404);
    }

    const id = env.SIGNAL_ROOM.idFromName(ROOM_ID);
    return env.SIGNAL_ROOM.get(id).fetch(request);
  }
};

export class SignalRoom {
  constructor(state) {
    this.state = state;
    this.rooms = new Map();
    this.sockets = new WeakMap();
    this.ready = state.blockConcurrencyWhile(async () => {
      const storedRooms = await state.storage.list({ prefix: ROOM_PREFIX });
      const expiresAt = Date.now() + ROOM_GRACE_MS;

      for (const [key, stored] of storedRooms) {
        const code = key.slice(ROOM_PREFIX.length);
        this.rooms.set(code, {
          sender: stored.senderId ? { id: stored.senderId, socket: null } : null,
          receiver: stored.receiverId ? { id: stored.receiverId, socket: null } : null,
          createdAt: stored.createdAt,
          expiresAt
        });
      }

      await this.persistAllRooms();
      await this.scheduleCleanup();
    });
  }

  async fetch(request) {
    await this.ready;

    if (request.headers.get('upgrade') !== 'websocket') {
      return json({ error: 'expected_websocket' }, 426);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.accept();
    this.sockets.set(server, { roomCode: null, role: null });

    server.addEventListener('message', (event) => {
      void this.handleMessage(server, event.data);
    });

    server.addEventListener('close', () => {
      void this.leave(server);
    });

    server.addEventListener('error', () => {
      void this.leave(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleMessage(ws, raw) {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      this.send(ws, { type: 'error', reason: 'INVALID_JSON' });
      return;
    }

    if (message.type === 'create') {
      await this.createRoom(ws, message.sessionId);
      return;
    }

    if (message.type === 'join') {
      await this.joinRoom(ws, message.code, message.sessionId);
      return;
    }

    if (message.type === 'resume') {
      await this.resumeRoom(ws, message.code, message.role, message.sessionId);
      return;
    }

    if (message.type === 'signal') {
      this.relay(ws, message.payload);
      return;
    }

    this.send(ws, { type: 'error', reason: 'UNKNOWN_MESSAGE' });
  }

  async createRoom(ws, rawSessionId) {
    const sessionId = this.sessionId(rawSessionId);
    if (!sessionId) {
      this.send(ws, { type: 'error', reason: 'INVALID_SESSION' });
      return;
    }

    const code = this.makeCode();
    const room = {
      sender: { id: sessionId, socket: ws },
      receiver: null,
      createdAt: Date.now(),
      expiresAt: null
    };
    this.rooms.set(code, room);
    this.sockets.set(ws, { roomCode: code, role: 'sender' });
    await this.persistRoom(code, room);
    this.send(ws, { type: 'created', code });
  }

  async joinRoom(ws, rawCode, rawSessionId) {
    const code = String(rawCode || '').trim();
    const sessionId = this.sessionId(rawSessionId);
    const room = this.rooms.get(code);

    if (!sessionId) {
      this.send(ws, { type: 'error', reason: 'INVALID_SESSION' });
      return;
    }

    if (!room || !room.sender?.socket) {
      this.send(ws, { type: 'error', reason: 'ROOM_NOT_FOUND' });
      return;
    }

    if (room.receiver && room.receiver.id !== sessionId) {
      this.send(ws, { type: 'error', reason: 'ROOM_FULL' });
      return;
    }

    room.receiver = { id: sessionId, socket: ws };
    room.expiresAt = null;
    this.sockets.set(ws, { roomCode: code, role: 'receiver' });
    await this.persistRoom(code, room);
    this.send(ws, { type: 'joined', code });
    this.notifyPeerReady(room);
  }

  async resumeRoom(ws, rawCode, role, rawSessionId) {
    const code = String(rawCode || '').trim();
    const sessionId = this.sessionId(rawSessionId);
    const room = this.rooms.get(code);

    if (!sessionId || (role !== 'sender' && role !== 'receiver')) {
      this.send(ws, { type: 'error', reason: 'INVALID_SESSION' });
      return;
    }

    const participant = room?.[role];
    if (!room || !participant || participant.id !== sessionId) {
      this.send(ws, { type: 'error', reason: 'SESSION_NOT_FOUND' });
      return;
    }

    if (participant.socket && participant.socket !== ws) {
      try {
        participant.socket.close(4001, 'Session resumed elsewhere');
      } catch {
        // The previous socket may already be closed.
      }
    }

    participant.socket = ws;
    room.expiresAt = null;
    this.sockets.set(ws, { roomCode: code, role });
    await this.persistRoom(code, room);

    const other = role === 'sender' ? room.receiver : room.sender;
    this.send(ws, { type: 'resumed', code, role, peerPresent: Boolean(other?.socket) });
    this.notifyPeerReady(room);
  }

  relay(ws, payload) {
    const meta = this.sockets.get(ws);
    const room = meta?.roomCode ? this.rooms.get(meta.roomCode) : null;

    if (!meta || !room) {
      this.send(ws, { type: 'error', reason: 'NO_ROOM' });
      return;
    }

    const target = meta.role === 'sender' ? room.receiver?.socket : room.sender?.socket;
    if (!target) {
      this.send(ws, { type: 'error', reason: 'PEER_NOT_READY' });
      return;
    }

    this.send(target, { type: 'signal', payload });
  }

  async leave(ws) {
    const meta = this.sockets.get(ws);
    if (!meta?.roomCode) return;

    const room = this.rooms.get(meta.roomCode);
    if (!room) return;

    const participant = room[meta.role];
    if (!participant || participant.socket !== ws) return;

    participant.socket = null;

    for (const peer of [room.sender, room.receiver]) {
      if (peer?.socket) this.send(peer.socket, { type: 'peer-left' });
    }

    if (!room.sender?.socket && !room.receiver?.socket) {
      room.expiresAt = Date.now() + ROOM_GRACE_MS;
    }

    await this.persistRoom(meta.roomCode, room);
    await this.scheduleCleanup();
  }

  makeCode() {
    let code = '';
    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
    } while (this.rooms.has(code));
    return code;
  }

  send(ws, message) {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      void this.leave(ws);
    }
  }

  notifyPeerReady(room) {
    if (!room.sender?.socket || !room.receiver?.socket) return;
    this.send(room.receiver.socket, { type: 'peer-ready' });
    this.send(room.sender.socket, { type: 'peer-ready' });
  }

  sessionId(value) {
    const sessionId = String(value || '').trim();
    return /^[a-zA-Z0-9-]{16,80}$/.test(sessionId) ? sessionId : null;
  }

  async persistRoom(code, room) {
    await this.state.storage.put(`${ROOM_PREFIX}${code}`, {
      senderId: room.sender?.id ?? null,
      receiverId: room.receiver?.id ?? null,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt
    });
  }

  async persistAllRooms() {
    await Promise.all([...this.rooms].map(([code, room]) => this.persistRoom(code, room)));
  }

  async scheduleCleanup() {
    const expirations = [...this.rooms.values()]
      .map((room) => room.expiresAt)
      .filter((expiresAt) => typeof expiresAt === 'number');

    if (expirations.length) {
      await this.state.storage.setAlarm(Math.min(...expirations));
    }
  }

  async alarm() {
    const now = Date.now();

    for (const [code, room] of this.rooms) {
      if (room.expiresAt && room.expiresAt <= now && !room.sender?.socket && !room.receiver?.socket) {
        this.rooms.delete(code);
        await this.state.storage.delete(`${ROOM_PREFIX}${code}`);
      }
    }

    await this.scheduleCleanup();
  }
}
