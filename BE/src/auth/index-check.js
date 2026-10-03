import { User, Session, AuthIdentity, AuthToken, AuthChallenge, EmailOutbox } from '../models/index.js';

export async function assertAuthIndexes() {
  for (const model of [User, Session, AuthIdentity, AuthToken, AuthChallenge, EmailOutbox]) {
    const existing = await model.collection.listIndexes().toArray();
    for (const [keys, options] of model.schema.indexes()) {
      if (!options.unique) continue;
      const found = existing.find((index) => index.unique && JSON.stringify(index.key) === JSON.stringify(keys)
        && JSON.stringify(index.partialFilterExpression) === JSON.stringify(options.partialFilterExpression));
      if (!found) throw new Error('Required Auth unique indexes missing; run db:indexes');
    }
  }
}
