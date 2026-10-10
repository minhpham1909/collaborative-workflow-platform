import test from 'node:test';
import assert from 'node:assert/strict';
import { organizationText } from '../src/lib/organization-text.js';
test('Missing transition labels remain safe to render in either language', () => {
  for (const locale of ['vi', 'en']) {
    assert.equal(organizationText(undefined, locale), undefined);
    assert.equal(organizationText(null, locale), null);
    assert.equal(organizationText(0, locale), 0);
  }
});
