import mongoose from 'mongoose';
import { readConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { Workspace, Task } from '../src/models/index.js';
try {
  await connectDatabase(readConfig().mongoUri);
  console.log(JSON.stringify({ mode: 'read_only', legacyWorkspaces: await Workspace.collection.countDocuments({ state: { $exists: false } }),
    legacyTrash: await Task.collection.countDocuments({ deletedAt: { $type: 'date' }, purgeAt: null }),
    scheduledTrash: await Task.collection.countDocuments({ deletedAt: { $type: 'date' }, purgeAt: { $type: 'date' } }),
    dueTrash: await Task.collection.countDocuments({ deletedAt: { $type: 'date' }, purgeAt: { $type: 'date', $lte: new Date() } }) }));
} finally { await mongoose.disconnect(); }
