require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDb = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const taskRoutes = require('./routes/tasks.routes');
const { createRealtimeServer } = require('./realtime');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = createRealtimeServer(server);

app.set('io', io);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Task Management API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use(notFound);
app.use(errorHandler);

connectDb()
  .then(() => {
    server.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });

module.exports = app;
