import { createHmac } from 'node:crypto';
import { secureEqual } from '../auth/tokens.js';
import { AuthError } from '../auth/errors.js';

export function previewCodec(key, now = () => new Date()) {
  if (!/^[a-f0-9]{64}$/.test(key ?? '')) throw new Error('Moderation preview key required');
  const signature = value => createHmac('sha256', Buffer.from(key, 'hex')).update(`moderation-preview-v1:${value}`).digest('hex');
  return {
    seal: data => { const encoded = Buffer.from(JSON.stringify({ ...data, expiresAt: now().getTime() + 600_000 })).toString('base64url'); return `${encoded}.${signature(encoded)}`; },
    open: (token, expected) => {
      try {
        const [encoded, mac, extra] = token.split('.');
        if (extra !== undefined || !encoded || !secureEqual(mac ?? '', signature(encoded))) throw new Error();
        const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
        if (value.expiresAt <= now().getTime() || Object.entries(expected).some(([key, item]) => value[key] !== item)) throw new Error();
        return { ...value, cutoff: new Date(value.cutoff), from: value.from ? new Date(value.from) : null };
      } catch { throw new AuthError('MODERATION_PREVIEW_INVALID', 409); }
    },
  };
}
