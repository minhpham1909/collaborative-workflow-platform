import { useDraftGuard } from "../../lib/draft-navigation.js";
import { useRef, useState } from "react";
import RichEditor from "../../components/RichEditor.jsx";
import {
  confirmDialog,
  notify,
} from "../../components/NotificationProvider.jsx";
import { envelope, emptyDocument, validateContent } from "../../lib/content.js";
import { messageFor } from "../../lib/messages.js";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
export default function ProjectDescriptionEditor({
  api,
  project,
  onDone,
  onCancel,
}) {
  const [value, setValue] = useState(
      project.description ?? envelope(emptyDocument()),
    ),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  useDraftGuard({
    dirty: dirty,
    busy: busy,
    message: "Bỏ mô tả Dự án chưa lưu?",
  });

  async function save(event) {
    event.preventDefault();
    if (pending.current || uncertain) return;
    const invalid = validateContent(value, 10000);
    if (invalid) {
      setError(invalid);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api.request(`/projects/${project.id}`, {
        method: "PATCH",
        body: { expectedVersion: project.version, description: value },
      });
      setDirty(false);
      notify("Đã lưu mục tiêu và mô tả Dự án.");
      onDone(data.project);
    } catch (error) {
      setUncertain(isUncertainMutation(error));
      setError(
        isUncertainMutation(error)
          ? "Chưa xác nhận kết quả lưu. Đóng form để tải lại trước khi thử lại."
          : messageFor(error),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="description-form" onSubmit={save}>
      <RichEditor
        value={value}
        onChange={(value) => {
          setValue(value);
          setDirty(true);
        }}
        readOnly={busy || uncertain}
        label="Mục tiêu & mô tả Dự án"
        limit={10000}
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="buttons">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (
              !dirty ||
              (await confirmDialog(
                uncertain
                  ? "Đóng form và tải lại để kiểm tra kết quả lưu?"
                  : "Bỏ mô tả Dự án chưa lưu?",
              ))
            )
              onCancel(uncertain);
          }}
        >
          Hủy mô tả
        </button>
        <button className="primary" disabled={busy || uncertain}>
          {busy ? "Đang lưu…" : "Lưu mô tả Dự án"}
        </button>
      </div>
    </form>
  );
}
