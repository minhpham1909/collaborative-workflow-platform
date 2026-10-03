export function readConfig(env = process.env) {
  const port = Number(env.PORT ?? 4000);
  const host = env.HOST ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  if (!['development', 'test', 'production'].includes(env.NODE_ENV ?? 'development')) {
    throw new Error('NODE_ENV is invalid');
  }
  if (!env.MONGODB_URI || !/^mongodb(?:\+srv)?:\/\//u.test(env.MONGODB_URI)) {
    throw new Error('MONGODB_URI must be configured');
  }
  if (!host.trim()) throw new Error('HOST must be configured');
  return { port, host, mongoUri: env.MONGODB_URI, nodeEnv: env.NODE_ENV ?? 'development' };
}
