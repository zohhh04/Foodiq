import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import config from './config/index.js';
import connectDB from './config/db.js';
import { setupSocket } from './sockets/queueSocket.js';

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.clientUrl, credentials: true },
});

setupSocket(io);
// Make `io` accessible to controllers via req.app.get('io')
app.set('io', io);

const start = async () => {
  await connectDB();

  httpServer.listen(config.port, () => {
    console.log(`Foodiq API running on http://localhost:${config.port}`);
    if (config.env !== 'production') console.log(`Socket.io listening on same port`);
  });
};

start();