export const emptyDocument = () => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});
export function visibleText(node) {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const children = node.content ?? [],
    parts = children.map(visibleText);
  if (
    node.type === "doc" &&
    children.length > 1 &&
    children.at(-1).type === "paragraph" &&
    parts.at(-1) === ""
  )
    parts.pop();
  return parts.join(["paragraph", "heading"].includes(node.type) ? "" : "\n");
}
export function validateContent(value, limit, required = false) {
  const text = visibleText(value?.document),
    count = [
      ...new Intl.Segmenter("vi", { granularity: "grapheme" }).segment(text),
    ].length;
  if (count > limit) return `Nội dung vượt quá ${limit} ký tự.`;
  if (required && !text.replace(/[\s\u200b-\u200d\ufeff]/gu, ""))
    return "Nhập nội dung bình luận.";
  return null;
}
export function envelope(document) {
  function clean(node) {
    const result = { type: node.type };
    if (node.type === "text") {
      result.text = node.text;
      if (node.marks?.length)
        result.marks = node.marks.map((m) =>
          m.type === "link"
            ? { type: "link", attrs: { href: m.attrs.href } }
            : { type: m.type },
        );
    }
    if (node.type === "heading") result.attrs = { level: node.attrs.level };
    if (node.type === "orderedList")
      result.attrs = { start: node.attrs?.start ?? 1 };
    if (node.content) result.content = node.content.map(clean);
    return result;
  }
  return {
    format: "prosemirror-json",
    schemaVersion: 1,
    document: clean(document),
  };
}
export function safeLink(href) {
  try {
    if (
      typeof href !== "string" ||
      /[\s\u0000-\u001f\u007f]/u.test(href) ||
      href.length > 2048
    )
      return false;
    const u = new URL(href);
    return u.protocol === "mailto:"
      ? Boolean(u.pathname) && !u.search && !u.hash
      : ["https:", "http:"].includes(u.protocol) &&
          Boolean(u.hostname) &&
          !u.username &&
          !u.password;
  } catch {
    return false;
  }
}
export function toVietnamInput(utc) {
  return utc
    ? new Date(new Date(utc).getTime() + 7 * 3600000).toISOString().slice(0, 16)
    : "";
}
export function toUtc(value) {
  return value ? new Date(value + ":00+07:00").toISOString() : null;
}
export const statuses = {
  todo: "Chưa làm",
  in_progress: "Đang làm",
  done: "Hoàn thành",
};
export const deadline = (utc) =>
  utc
    ? new Date(utc).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Không có hạn";
