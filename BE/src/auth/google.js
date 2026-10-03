import { OAuth2Client } from 'google-auth-library';
import { AuthError } from './errors.js';
import { emailInput, displayNameInput } from './account-input.js';
import { secureEqual } from './tokens.js';
import { isSafeLink } from '../content/rich-text.js';

export function createGoogleVerifier(clientId, client = new OAuth2Client(), now = () => new Date()) {
  return async (credential, nonce) => {
    if (!clientId) throw new AuthError('GOOGLE_NOT_CONFIGURED', 503);
    if (typeof credential !== 'string' || credential.length > 12_000) throw new AuthError('GOOGLE_CREDENTIAL_INVALID');
    let claims;
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
      claims = ticket.getPayload();
      const seconds = Math.floor(now().getTime() / 1000);
      if (!claims || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) || claims.aud !== clientId || !Number.isSafeInteger(claims.exp) || claims.exp <= seconds || !Number.isSafeInteger(claims.iat) || claims.iat > seconds || !secureEqual(claims.nonce, nonce) || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255) throw new Error();
    } catch { throw new AuthError('GOOGLE_CREDENTIAL_INVALID'); }
    const email = emailInput(claims.email);
    let name;
    try { name = displayNameInput(claims.name); } catch { name = 'Google User'; }
    const picture = isSafeLink(claims.picture) && claims.picture.startsWith('https:') ? claims.picture : null;
    return {
      subject: claims.sub, email, displayName: name, picture,
      authoritativeEmail: claims.email_verified === true && (email.endsWith('@gmail.com') || (typeof claims.hd === 'string' && Boolean(claims.hd))),
    };
  };
}
