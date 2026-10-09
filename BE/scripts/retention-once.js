import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { readConfig } from '../src/config.js';
import { runTaskRetention } from '../src/work/retention.js';
try { await connectDatabase(readConfig().mongoUri); console.log(JSON.stringify(await runTaskRetention())); }
finally { await mongoose.disconnect(); }
