import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueFeedback } from '../src/lib/feedback-queue.js';
test('Transient feedback retains critical messages within the bounded queue', () => {
  let queue = [];
  queue = enqueueFeedback(queue, { id: 'error', message: 'Unable to save', tone: 'error' });
  for (let index = 0; index < 6; index++) queue = enqueueFeedback(queue, { id: index, message: `Saved ${index}`, tone: 'success' });
  assert.equal(queue.length, 4);
  assert.equal(queue[0].id, 'error');
  queue = enqueueFeedback(queue, { id: 'updated-error', message: 'Unable to save', tone: 'error' });
  assert.equal(queue.filter(item => item.message === 'Unable to save').length, 1);
  assert.equal(queue[0].id, 'updated-error');
});
