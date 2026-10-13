import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCreationDraft, saveCreationDraft, clearCreationDraft } from '../src/lib/workspace-creation-draft.js';
test('Unknown Workspace creation survives reload only in its account session, without accepting extra stored data', () => {
 const data = new Map(), storage = { getItem: key => data.get(key), setItem: (key,value) => data.set(key,value), removeItem: key => data.delete(key) };
 const request = { requestId: 'd7d22c46-9cd2-45c0-a4a2-985d4662747a', name: 'Nhóm', summary: null, icon: 'folder', color: 'lavender', coverId: 'moodboard' };
 saveCreationDraft(storage, 'a', request); assert.deepEqual(readCreationDraft(storage, 'a'), request); assert.equal(readCreationDraft(storage, 'b'), null);
 saveCreationDraft(storage, 'a', { ...request, ownerId: 'injected' }); assert.equal(readCreationDraft(storage, 'a'), null);
 saveCreationDraft(storage, 'a', { ...request, color: 'invalid' }); assert.equal(readCreationDraft(storage, 'a'), null);
 saveCreationDraft(storage, 'a', request); clearCreationDraft(storage, 'a'); assert.equal(readCreationDraft(storage, 'a'), null);
 assert.equal(readCreationDraft({getItem(){throw Error('Blocked storage');}}, 'a'), null);
});
