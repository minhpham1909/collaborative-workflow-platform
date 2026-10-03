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

export function readAuthConfig(env = process.env) {
  const webOrigin = env.WEB_ORIGIN;
  try {
    const url = new URL(webOrigin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== webOrigin) throw new Error();
    if (env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error();
  } catch { throw new Error('WEB_ORIGIN must be an exact HTTP(S) origin; production requires HTTPS'); }
  const accessKeyHex = env.JWT_ACCESS_KEY_HEX;
  const refreshKeyHex = env.JWT_REFRESH_KEY_HEX;
  if (!/^[a-f0-9]{64}$/u.test(accessKeyHex ?? '') || !/^[a-f0-9]{64}$/u.test(refreshKeyHex ?? '') || accessKeyHex === refreshKeyHex) throw new Error('Distinct random JWT keys required');
  return {
    webOrigin, accessKeyHex, refreshKeyHex, secureCookies: env.NODE_ENV === 'production',
    issuer: 'workflow-api', audience: 'workflow-web', accessTtlSeconds: 900, refreshTtlSeconds: 7 * 24 * 60 * 60,
  };
}
