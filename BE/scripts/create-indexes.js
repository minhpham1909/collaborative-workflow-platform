import mongoose from 'mongoose';
import { readConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { models } from '../src/models/index.js';

try {
  await connectDatabase(readConfig().mongoUri);
  for (const model of Object.values(models)) {
    // createIndexes adds declared indexes; never use syncIndexes to drop existing ones here.
    await model.createIndexes();
    console.info(`Indexes created: ${model.collection.name}`);
  }
} catch {
  console.error('INDEX_CREATION_FAILED: inspect configuration, topology and existing data');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
