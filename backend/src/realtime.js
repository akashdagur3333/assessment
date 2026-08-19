const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('./models/User');

function createRealtimeServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200',
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-secret-change-me');
      const user = await User.findById(payload.id).select('_id role');

      if (!user) {
        return next(new Error('User no longer exists'));
      }

      socket.user = user;
      socket.join(`user:${user._id}`);
      socket.join(`role:${user.role}`);
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  return io;
}

function emitTaskChanged(req, action, taskId) {
  req.app.get('io')?.emit('tasks:changed', {
    action,
    taskId,
    at: new Date().toISOString()
  });
}

function emitUsersChanged(req, action, userId) {
  req.app.get('io')?.emit('users:changed', {
    action,
    userId,
    at: new Date().toISOString()
  });
}

module.exports = {
  createRealtimeServer,
  emitTaskChanged,
  emitUsersChanged
};
