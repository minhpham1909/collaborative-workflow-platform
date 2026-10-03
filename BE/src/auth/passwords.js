import { hash, verify, Algorithm } from '@node-rs/argon2';
import { AuthError } from './errors.js';

const options = { algorithm: Algorithm.Argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 };
export function validatePassword(value) {
  if (typeof value !== 'string' || [...value].length < 12 || [...value].length > 128 || Buffer.byteLength(value) > 512) {
    throw new AuthError('INVALID_INPUT', 400);
  }
  return value; // Preserve whitespace and Unicode exactly; never trim or normalize passwords.
}
export async function hashPassword(value) { return hash(validatePassword(value), options); }
export async function verifyPassword(encoded, value) {
  validatePassword(value);
  try { return await verify(encoded, value); } catch { return false; }
}
