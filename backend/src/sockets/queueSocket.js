import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { getQueueStatusWithPositions } from '../services/queueService.js';

// Wire Socket.io handler. Attach `io` to the express app for controllers.
export const setupSocket = (io) => {
  // Authenticate connections via the JWT sent in the handshake auth payload.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // public guest connection (live board)
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.data.userId = decoded.id;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket) => {
    // Join the global queue counter room (live board + order display).
    socket.join('queue:counter');

    // Authenticated users also join their own room for realtime notifications.
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }

    // Staff/admins join the admin room so new orders can be pushed live
    // to the admin Orders page without a reload.
    if (socket.data.role === 'admin' || socket.data.role === 'staff') {
      socket.join('admin:orders');
    }

    // Watch a specific order's live status.
    socket.on('join:order', (orderId) => {
      socket.join(`order:${orderId}`);
      socket.emit('joined:order', { orderId });
    });
    socket.on('leave:order', (orderId) => socket.leave(`order:${orderId}`));

    // A connecting client can request the current queue snapshot.
    socket.on('queue:snapshot', async (cb) => {
      const queue = await getQueueStatusWithPositions();
      if (typeof cb === 'function') cb({ queue });
    });

    socket.on('disconnect', () => {
      /* room cleanup is automatic */
    });
  });
};
