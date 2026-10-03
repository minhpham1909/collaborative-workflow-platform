import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  await mongoose.connect(uri, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });
  // Business transactions need a replica set (or sharded cluster), not standalone MongoDB.
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') {
    await mongoose.disconnect();
    throw new Error('MongoDB must support transactions');
  }
  return mongoose.connection;
}
