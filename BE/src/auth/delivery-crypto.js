import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function createDeliveryCrypto(keyHex) {
  if (!/^[a-f0-9]{64}$/u.test(keyHex ?? '')) throw new Error('Mail outbox encryption key must be configured');
  const key = Buffer.from(keyHex, 'hex');
  return {
    seal(data, eventId) {
      const nonce = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, nonce);
      cipher.setAAD(Buffer.from(eventId));
      const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
      return { keyId: 'auth-mail-v1', nonce: nonce.toString('base64'), ciphertext: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
    },
    open(envelope, eventId) {
      if (envelope?.keyId !== 'auth-mail-v1') throw new Error('Unknown encryption key');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.nonce, 'base64'));
      decipher.setAAD(Buffer.from(eventId));
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
    },
  };
}
