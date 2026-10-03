import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countContent, emptyRichText, isSafeLink, normalizeRichText } from '../src/content/rich-text.js';

const doc = (content) => ({ format: 'prosemirror-json', schemaVersion: 1, document: { type: 'doc', content } });
const text = (value, marks) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) });
const paragraph = (...content) => ({ type: 'paragraph', content });

test('Vietnamese/combined emoji round-trip; server derives text and grapheme count', () => {
  const input = doc([paragraph(text('Tiếng Việt 👨‍👩‍👧‍👦 👍🏽')), paragraph()]);
  input.plainText = 'client-forged';
  const output = normalizeRichText(input);
  assert.equal(output.plainText, 'Tiếng Việt 👨‍👩‍👧‍👦 👍🏽');
  assert.deepEqual(output.document, input.document);
  assert.equal(countContent('a\u0301👨‍👩‍👧‍👦👍🏽').characters, 3);
  assert.equal(countContent('Tiếng Việt').words, 2);
});
test('heading, list, quote, marks and linebreaks retain visible text, not hidden URLs', () => {
  const output = normalizeRichText(doc([
    { type: 'heading', attrs: { level: 1 }, content: [text('Title', [{ type: 'bold' }])] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('Website', [{ type: 'link', attrs: { href: 'https://example.com/hidden' } }]))] }] },
    { type: 'blockquote', content: [paragraph(text('A'), { type: 'hardBreak' }, text('B'))] },
  ]));
  assert.equal(output.plainText, 'Title\nWebsite\nA\nB');
});
test('blocks arbitrary HTML, unknown properties, malformed trees, dangerous link schemes', () => {
  for (const input of [
    doc([{ type: 'html', text: '<script>alert(1)</script>' }]),
    doc([paragraph({ type: 'text', text: 'X', attrs: { onclick: 'evil()' } })]),
    doc([paragraph(text('X', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]))]),
    doc([paragraph(text('X', [{ type: 'link', attrs: { href: 'data:text/html,evil' } }]))]),
    doc([paragraph(text('X', [{ type: 'link', attrs: { href: 'https://a.test', target: '_self' } }]))]),
    doc([{ type: 'heading', attrs: { level: 7 }, content: [] }]),
    doc([text('wrong parent')]),
    doc([{ type: 'paragraph', content: {} }]),
    { ...emptyRichText(), schemaVersion: 2 },
  ]) assert.throws(() => normalizeRichText(input), TypeError);
  for (const href of ['//example.com', 'https://user:secret@example.com', 'file:///secret', 'mailto:a@b.test?body=evil', 'https://a.test\n']) assert.equal(isSafeLink(href), false);
  assert.equal(isSafeLink('mailto:member@example.com'), true);
});
test('visible/raw/complexity limits reject rather than truncate; blank required content rejected', () => {
  assert.throws(() => normalizeRichText(doc([paragraph(text('abc'))]), { maxCharacters: 2 }), /character limit/u);
  assert.throws(() => normalizeRichText(doc([paragraph(text('x'.repeat(270_000)))])), /byte limit/u);
  assert.throws(() => normalizeRichText(doc(Array.from({ length: 5001 }, () => paragraph()))), /complexity limit/u);
  let nested = paragraph(text('deep'));
  for (let depth = 0; depth < 22; depth++) nested = { type: 'blockquote', content: [nested] };
  assert.throws(() => normalizeRichText(doc([nested])), /complexity limit/u);
  assert.throws(() => normalizeRichText(doc([paragraph(text(' \u200b'))]), { required: true }), /blank/u);
  assert.equal(normalizeRichText(emptyRichText()).plainText, '');
});
