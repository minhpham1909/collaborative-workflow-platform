import test from "node:test";
import assert from "node:assert/strict";
import {
  envelope,
  safeLink,
  toUtc,
  toVietnamInput,
} from "../src/lib/content.js";
import { normalizeRichText } from "../../BE/src/content/rich-text.js";
test("Editor JSON roundtrips BE headings, Unicode, lists and safe links without library-only attrs", () => {
  const document = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [
          { type: "text", text: "Tiêu đề 😊", marks: [{ type: "bold" }] },
        ],
      },
      {
        type: "orderedList",
        attrs: { start: 1, type: null },
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Tài liệu",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: "https://example.com",
                          target: "_blank",
                          rel: "noopener",
                          class: null,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const normalized = normalizeRichText(envelope(document));
  assert.match(normalized.plainText, /Tiêu đề 😊/);
  assert.match(normalized.plainText, /Tài liệu/);
  assert.equal(safeLink("javascript:alert(1)"), false);
  assert.equal(safeLink("https://user:pass@example.com"), false);
  assert.equal(safeLink("https://example.com"), true);
});
test("Task deadline inputs use Vietnam minute precision independent of host timezone", () => {
  const utc = toUtc("2026-10-04T09:30");
  assert.equal(utc, "2026-10-04T02:30:00.000Z");
  assert.equal(toVietnamInput(utc), "2026-10-04T09:30");
  assert.equal(toUtc(""), null);
});
