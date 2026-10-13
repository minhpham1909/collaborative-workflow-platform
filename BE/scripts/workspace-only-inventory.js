import mongoose from 'mongoose';
import { readConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { validateInventoryTarget, readInventorySnapshot, analyzeWorkspaceOnlyInventory } from '../src/workspace-only/inventory.js';
try {
  if (process.argv.length !== 2) throw Error('NO_APPLY_OR_ARGUMENTS_SUPPORTED');
  const config = readConfig(); validateInventoryTarget(config); await connectDatabase(config.mongoUri);
  const report = await mongoose.connection.transaction(async session => { const asOf = new Date(); return analyzeWorkspaceOnlyInventory(await readInventorySnapshot(mongoose.connection.db, session), asOf); }, {readConcern:{level:'snapshot'}});
  console.info(JSON.stringify(report));
} catch { console.error('WORKSPACE_INVENTORY_FAILED: project development replica27018 required; no data was changed'); process.exitCode=1; }
finally { await mongoose.disconnect(); }
