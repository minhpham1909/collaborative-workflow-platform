import { InlineMessage } from "./Feedback.jsx";
import { inputDialog } from "./NotificationProvider.jsx";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import {
  emptyDocument,
  envelope,
  safeLink,
  visibleText,
} from "../lib/content.js";
export default function RichEditor({
  value,
  onChange,
  readOnly = false,
  label = "Nội dung",
  limit = 10000,
}) {
  const latest = useRef(onChange);
  const container = useRef(null);
  latest.current = onChange;
  const [text, setText] = useState(""),
    [error, setError] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: false,
          linkOnPaste: false,
          isAllowedUri: safeLink,
        },
      }),
    ],
    content: value?.document ?? emptyDocument(),
    editable: !readOnly,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        "aria-readonly": String(readOnly),
      },
    },
    onUpdate: ({ editor }) => {
      setText(visibleText(editor.getJSON()));
      latest.current?.(envelope(editor.getJSON()));
    },
    onCreate: ({ editor }) => setText(visibleText(editor.getJSON())),
  });
  useEffect(() => {
    editor?.setEditable(!readOnly, false);
    container.current
      ?.querySelector(".tiptap")
      ?.setAttribute("aria-readonly", String(readOnly));
  }, [readOnly, editor]);
  useEffect(() => {
    if (editor && readOnly)
      editor.commands.setContent(value?.document ?? emptyDocument(), {
        emitUpdate: false,
      });
  }, [editor, readOnly, value]);
  const chars = [
      ...new Intl.Segmenter("vi", { granularity: "grapheme" }).segment(text),
    ].length,
    words = [
      ...new Intl.Segmenter("vi", { granularity: "word" }).segment(text),
    ].filter((s) => s.isWordLike).length;
  if (!editor) return null;
  async function link() {
    const href = await inputDialog(
      "Đường dẫn https:// hoặc mailto: (để trống để bỏ liên kết)",
      editor.getAttributes("link").href ?? "",
    );
    if (href === null) return;
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!safeLink(href)) {
      setError("Liên kết chưa hợp lệ.");
      return;
    }
    setError("");
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }
  return (
    <div
      ref={container}
      className={"rich-editor" + (readOnly ? " read-only" : "")}
    >
      {!readOnly && (
        <div
          className="editor-toolbar"
          role="group"
          aria-label={"Định dạng " + label}
        >
          {[
            ["B", () => editor.chain().focus().toggleBold().run()],
            ["I", () => editor.chain().focus().toggleItalic().run()],
            ["U", () => editor.chain().focus().toggleUnderline().run()],
            [
              "H1",
              () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            ],
            [
              "H2",
              () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            ],
            ["Nội dung", () => editor.chain().focus().setParagraph().run()],
            ["• List", () => editor.chain().focus().toggleBulletList().run()],
            ["1. List", () => editor.chain().focus().toggleOrderedList().run()],
            ["Link", link],
            ["😊", () => editor.chain().focus().insertContent("😊").run()],
            ["↶", () => editor.chain().focus().undo().run()],
            ["↷", () => editor.chain().focus().redo().run()],
          ].map(([name, run]) => (
            <button
              key={name}
              type="button"
              onClick={run}
              aria-label={toolbarLabels[name]}
              title={toolbarLabels[name]}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <EditorContent editor={editor} />
      {!readOnly && (
        <p className={chars > limit ? "error" : "muted"} role="status">
          {words} từ · {chars}/{limit} ký tự
        </p>
      )}
      {error && <InlineMessage>{error}</InlineMessage>}
    </div>
  );
}
const toolbarLabels = {
  B: "Đậm",
  I: "Nghiêng",
  U: "Gạch chân",
  H1: "Tiêu đề 1",
  H2: "Tiêu đề 2",
  "Nội dung": "Văn bản thường",
  "• List": "Danh sách dấu đầu dòng",
  "1. List": "Danh sách đánh số",
  Link: "Chèn hoặc sửa liên kết",
  "😊": "Thêm emoji",
  "↶": "Hoàn tác",
  "↷": "Làm lại",
};
