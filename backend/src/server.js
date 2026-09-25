import { createServer } from 'node:http';

import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { attachSocketServer } from './socket.js';

let server;

async function startServer() {
  await connectDatabase();

  server = createServer(app);
  attachSocketServer(server);
  server.listen(env.port, '0.0.0.0', () => {
    console.log(`BloodBridge API listening on http://localhost:${env.port}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((error) => {
  console.error('Unable to start BloodBridge API:', error);
  process.exit(1);
});
