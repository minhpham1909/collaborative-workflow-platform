import mongoose from 'mongoose';
import { readConfig } from './config.js';
import { connectDatabase } from './database.js';
import { createApp } from './app.js';
import './models/index.js';

let server;
let stopping = false;
async function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  clearTimeout(timeout);
  process.exitCode = exitCode;
}
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
try {
  const config = readConfig();
  await connectDatabase(config.mongoUri);
  const app = createApp({ isReady: () => !stopping && mongoose.connection.readyState === 1 });
  server = app.listen(config.port, config.host, () => {
    console.info(`API listening at http://${config.host}:${config.port}`);
  });
  server.on('error', () => { console.error('API_LISTEN_FAILED'); void stop(1); });
} catch {
  // Never log connection strings, credentials or database exception text.
  console.error('API_STARTUP_FAILED: check configuration and MongoDB replica set availability');
  await stop(1);
}
