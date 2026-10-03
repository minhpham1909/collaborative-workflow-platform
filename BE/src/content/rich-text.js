const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });
const words = new Intl.Segmenter('vi', { granularity: 'word' });
const inline = new Set(['text', 'hardBreak']);
const blocks = new Set(['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList']);
const simpleMarks = new Set(['bold', 'italic', 'underline', 'strike', 'code']);
export const CONTENT_LIMITS = Object.freeze({ workspace: 20_000, project: 10_000, task: 10_000, comment: 5_000 });

function fail(message) { throw new TypeError(message); }
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail('Expected a plain object');
  }
}
function keys(value, allowed) {
  object(value);
  if (Object.keys(value).some((key) => !allowed.includes(key))) fail('Unknown content field');
}
export function isSafeLink(href) {
  if (typeof href !== 'string' || href.length > 2048 || /[\s\u0000-\u001f\u007f]/u.test(href)) return false;
  try {
    const url = new URL(href);
    if (url.protocol === 'mailto:') return Boolean(url.pathname) && !url.search && !url.hash;
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}
export function countContent(plainText) {
  return {
    characters: [...segmenter.segment(plainText)].length,
    words: [...words.segment(plainText)].filter((part) => part.isWordLike).length,
  };
}

// Input is a JSON tree, never arbitrary HTML. FE library is still independently selectable.
export function normalizeRichText(input, { maxCharacters = 10_000, required = false } = {}) {
  keys(input, ['format', 'schemaVersion', 'document', 'plainText']);
  if (input.format !== 'prosemirror-json' || input.schemaVersion !== 1) fail('Unsupported editor format/version');
  let serialized;
  try { serialized = JSON.stringify(input.document); } catch { fail('Invalid editor tree'); }
  if (!serialized || Buffer.byteLength(serialized, 'utf8') > 256 * 1024) fail('Editor tree exceeds byte limit');
  let nodeCount = 0;
  function visit(node, parent, depth) {
    if (++nodeCount > 5000 || depth > 20) fail('Editor tree exceeds complexity limit');
    keys(node, ['type', 'attrs', 'content', 'text', 'marks']);
    const { type } = node;
    const permitted = parent === null ? new Set(['doc'])
      : ['paragraph', 'heading'].includes(parent) ? inline
      : ['bulletList', 'orderedList'].includes(parent) ? new Set(['listItem'])
      : blocks;
    if (!permitted.has(type)) fail('Invalid node or parent');
    if (type === 'text') {
      if (typeof node.text !== 'string' || node.text.length === 0 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(node.text)) fail('Invalid text');
      if (node.attrs !== undefined || node.content !== undefined) fail('Text cannot contain attributes/children');
      if (node.marks !== undefined) {
        if (!Array.isArray(node.marks) || node.marks.length > 6) fail('Invalid marks');
        const seen = new Set();
        for (const mark of node.marks) {
          keys(mark, ['type', 'attrs']);
          if (seen.has(mark.type)) fail('Duplicate mark');
          seen.add(mark.type);
          if (mark.type === 'link') {
            keys(mark.attrs, ['href']);
            if (!isSafeLink(mark.attrs.href)) fail('Unsafe link');
          } else if (!simpleMarks.has(mark.type) || mark.attrs !== undefined) fail('Unknown mark/attributes');
        }
      }
      return node.text;
    }
    if (node.text !== undefined || node.marks !== undefined) fail('Only text nodes carry text/marks');
    if (type === 'hardBreak') {
      if (node.attrs !== undefined || node.content !== undefined) fail('Invalid hard break');
      return '\n';
    }
    if (type === 'heading') {
      keys(node.attrs, ['level']);
      if (![1, 2, 3].includes(node.attrs.level)) fail('Invalid heading level');
    } else if (type === 'orderedList' && node.attrs !== undefined) {
      keys(node.attrs, ['start']);
      if (!Number.isInteger(node.attrs.start) || node.attrs.start < 1 || node.attrs.start > 9999) fail('Invalid list start');
    } else if (node.attrs !== undefined) fail('Unexpected node attributes');
    const children = node.content ?? [];
    if (!Array.isArray(children)) fail('Content must be an array');
    if (!['paragraph', 'heading'].includes(type) && children.length === 0) fail('Container must not be empty');
    const textParts = children.map((child) => visit(child, type, depth + 1));
    // A final empty paragraph is an editor cursor placeholder, not visible content.
    if (type === 'doc' && children.length > 1 && children.at(-1).type === 'paragraph' && textParts.at(-1) === '') textParts.pop();
    return textParts.join(['paragraph', 'heading'].includes(type) ? '' : '\n');
  }
  const plainText = visit(input.document, null, 0);
  if (countContent(plainText).characters > maxCharacters) fail('Visible content exceeds character limit');
  if (required && !plainText.replace(/[\s\u200b-\u200d\ufeff]/gu, '')) fail('Content cannot be blank');
  return { format: 'prosemirror-json', schemaVersion: 1, document: JSON.parse(serialized), plainText };
}

export function emptyRichText() {
  return { format: 'prosemirror-json', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'paragraph' }] }, plainText: '' };
}
