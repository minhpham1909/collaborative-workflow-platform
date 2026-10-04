import { useDraftGuard } from "../../lib/draft-navigation.js";
import {
  confirmDialog,
  notify,
} from "../../components/NotificationProvider.jsx";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
import { useEffect, useRef, useState } from "react";
import RichEditor from "../../components/RichEditor.jsx";
import { toVietnamInput, toUtc, validateContent } from "../../lib/content.js";
import { messageFor } from "../../lib/messages.js";
export default function TaskForm({
  api,
  projectId,
  workspaceId,
  task,
  onDone,
  onCancel,
}) {
  const [title, setTitle] = useState(task?.title ?? ""),
    [description, setDescription] = useState(task?.description),
    [assigneeId, setAssignee] = useState(task?.assigneeId ?? ""),
    [due, setDue] = useState(toVietnamInput(task?.dueAt)),
    [members, setMembers] = useState({ items: [] }),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const pending = useRef(false);
  async function people(cursor) {
    try {
      const data = await api.request(
        `/workspaces/${workspaceId}/members?limit=20` +
          (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      setMembers((old) => ({
        ...data,
        items: cursor ? [...old.items, ...data.items] : data.items,
      }));
    } catch (e) {
      setError(messageFor(e));
    }
  }
  useEffect(() => {
    let live = true;
    api
      .request(`/workspaces/${workspaceId}/members?limit=20`)
      .then((data) => {
        if (live) setMembers(data);
      })
      .catch((e) => {
        if (live) setError(messageFor(e));
      });
    return () => {
      live = false;
    };
  }, [workspaceId]);
  useDraftGuard({
    dirty: dirty,
    busy: busy,
    message: "Bỏ nội dung chưa lưu và chuyển trang?",
  });

  async function save(e) {
    e.preventDefault();
    if (pending.current || uncertain) return;
    const invalid = validateContent(description, 10000);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!title.trim() || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(title)) {
      setError("Tiêu đề chưa hợp lệ.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const body = {
        title,
        ...(description ? { description } : {}),
        dueAt: toUtc(due),
      };
      if (!task || assigneeId !== (task.assigneeId ?? ""))
        body.assigneeId = assigneeId || null;
      if (task) body.expectedVersion = task.version;
      const result = await api.request(
        task ? `/tasks/${task.id}` : `/projects/${projectId}/tasks`,
        { method: task ? "PATCH" : "POST", body },
      );
      setDirty(false);
      notify("Đã lưu Task.");
      onDone(result.task);
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : "Chưa xác nhận kết quả. Kiểm tra dữ liệu trước khi gửi lại.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="project-info">
      <h2>{task ? "Sửa Task" : "Tạo Task"}</h2>
      <form onSubmit={save}>
        <fieldset disabled={busy} onChange={() => setDirty(true)}>
          <label>
            Tiêu đề Task
            <input
              required
              maxLength={300}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Người thực hiện
            <select
              aria-label="Người thực hiện"
              value={assigneeId}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Chưa phân công</option>
              {task?.assigneeId &&
                !members.items.some((m) => m.userId === task.assigneeId) && (
                  <option value={task.assigneeId}>
                    {task.assignee?.displayName ?? "Người được giao"}
                    {task.assigneeLeft ? " · Đã rời" : ""}
                  </option>
                )}
              {members.items.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
          {members.nextCursor && (
            <button type="button" onClick={() => people(members.nextCursor)}>
              Tải thêm thành viên
            </button>
          )}
          <label>
            Deadline · Giờ Việt Nam
            <input
              type="datetime-local"
              step="60"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
          {due && new Date(toUtc(due)) < new Date() && (
            <p className="archive-banner">
              Hạn đã qua. Bạn vẫn có thể lưu thời hạn này.
            </p>
          )}
          <p>Mô tả</p>
          <RichEditor
            value={description}
            onChange={(value) => {
              setDescription(value);
              setDirty(true);
            }}
            label="Mô tả Task"
            readOnly={busy}
          />
          <div className="buttons">
            <button
              type="button"
              onClick={async () => {
                if (
                  !dirty ||
                  (await confirmDialog(
                    uncertain
                      ? "Đóng form và tải lại để kiểm tra Task đã lưu chưa?"
                      : "Bỏ thay đổi Task chưa lưu?",
                  ))
                )
                  onCancel(uncertain);
              }}
            >
              Hủy
            </button>
            <button className="primary" disabled={uncertain}>
              {busy ? "Đang lưu…" : "Lưu Task"}
            </button>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
