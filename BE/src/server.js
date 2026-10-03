import mongoose from 'mongoose';
import { readConfig, readAuthConfig } from './config.js';
import { connectDatabase } from './database.js';
import { createApp } from './app.js';
import './models/index.js';
import { createAuthService } from './auth/service.js';
import { createMongoAccountStore } from './auth/mongo-accounts.js';
import { createAccountsService } from './auth/accounts-service.js';
import { createGoogleVerifier } from './auth/google.js';
import { assertAuthIndexes } from './auth/index-check.js';
import { createMongoUsersStore } from './users/mongo-store.js';
import { createUsersService } from './users/service.js';
import { createWorkspaceService } from './workspaces/service.js';
import { createMongoWorkspaceStore } from './workspaces/mongo-store.js';
import { assertWorkspaceIndexes } from './workspaces/index-check.js';
import { createWorkService } from './work/service.js';
import { createMongoWorkStore } from './work/mongo-store.js';

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
  const authConfig = readAuthConfig();
  await connectDatabase(config.mongoUri);
  await assertAuthIndexes();
  await assertWorkspaceIndexes();
  const store = createMongoAccountStore();
  const authService = await createAuthService({ store, config: authConfig });
  const accountsService = createAccountsService({ store, config: authConfig, verifyGoogle: createGoogleVerifier(authConfig.googleClientId) });
  const usersService = createUsersService({ store: createMongoUsersStore() });
  const workspaceService = createWorkspaceService({ store: createMongoWorkspaceStore({ config: authConfig }) });
  const workService = createWorkService({ store: createMongoWorkStore() });
  const app = createApp({ isReady: () => !stopping && mongoose.connection.readyState === 1, authService, authConfig, accountsService, usersService, workspaceService, workService });
  if (!stopping) {
    server = app.listen(config.port, config.host, () => {
      console.info(`API listening at http://${config.host}:${config.port}`);
    });
    server.on('error', () => { console.error('API_LISTEN_FAILED'); void stop(1); });
  }
} catch {
  // Never log connection strings, credentials or database exception text.
  console.error('API_STARTUP_FAILED: check configuration and MongoDB replica set availability');
  await stop(1);
}
