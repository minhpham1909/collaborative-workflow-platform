import { InlineMessage } from "../../components/Feedback.jsx";
import { useDraftGuard } from "../../lib/draft-navigation.js";
import FormField from "../../components/FormField.jsx";
import MemberPicker from "../../components/MemberPicker.jsx";
import TaskLabelPicker from '../../components/TaskLabelPicker.jsx';
import {
  confirmDialog,
  notify,
} from "../../components/NotificationProvider.jsx";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
import { useRef, useState } from "react";
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
    [titleError, setTitleError] = useState(""),
    [descriptionError, setDescriptionError] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const pending = useRef(false);
  const [priority, setPriority] = useState(task?.priority ?? 'medium'), [labelIds, setLabelIds] = useState(task?.labelIds ?? []);
  useDraftGuard({
    dirty: dirty,
    busy: busy,
    message: "Bỏ nội dung chưa lưu và chuyển trang?",
  });

  async function save(e) {
    e.preventDefault();
    if (pending.current || uncertain) return;
    const invalid = validateContent(description, 10000);
    setTitleError("");
    setDescriptionError("");
    if (invalid) {
      setDescriptionError(invalid);
      return;
    }
    if (!title.trim() || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(title)) {
      setTitleError(
        "Nhập tiêu đề có nội dung, không chứa ký tự xuống dòng hoặc điều khiển.",
      );
      e.currentTarget.querySelector("input")?.focus();
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
      if (!task || priority !== (task.priority ?? 'medium')) body.priority = priority;
      const previous = task?.labelIds ?? [];
      if (!task || previous.length !== labelIds.length || previous.some(id => !labelIds.includes(id))) body.labelIds = labelIds;
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
        <fieldset disabled={busy}>
          <FormField
            label="Tiêu đề Task"
            error={titleError}
            hint="Tối đa 300 ký tự."
          >
            {(props) => (
              <input
                {...props}
                required
                maxLength={300}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError("");
                  setDirty(true);
                }}
              />
            )}
          </FormField>
          <MemberPicker
            api={api}
            workspaceId={workspaceId}
            value={assigneeId}
            selectedMember={
              task?.assigneeId
                ? {
                    userId: task.assigneeId,
                    displayName:
                      task.assignee?.displayName ?? "Người được giao",
                    left: task.assigneeLeft,
                  }
                : undefined
            }
            disabled={busy || uncertain}
            onChange={(value) => {
              setAssignee(value);
              setDirty(true);
            }}
          />
          <FormField label="Mức ưu tiên" hint="Ba mức dùng chung trong Project.">{props => <select {...props} value={priority} disabled={busy || uncertain} onChange={event => { setPriority(event.target.value); setDirty(true); }}><option value="low">Thấp</option><option value="medium">Vừa</option><option value="high">Cao</option></select>}</FormField>
          <TaskLabelPicker api={api} projectId={projectId ?? task?.projectId} value={labelIds} selectedLabels={task?.labels} disabled={busy || uncertain} onChange={value => { setLabelIds(value); setDirty(true); }} />
          <label>
            Deadline · Giờ Việt Nam
            <input
              type="datetime-local"
              step="60"
              value={due}
              onChange={(e) => {
                setDue(e.target.value);
                setDirty(true);
              }}
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
              setDescriptionError("");
              setDirty(true);
            }}
            label="Mô tả Task"
            readOnly={busy}
          />
          {descriptionError && (
            <InlineMessage className="field-message error">
              {descriptionError}
            </InlineMessage>
          )}
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
        {error && <InlineMessage>{error}</InlineMessage>}
      </form>
    </section>
  );
}
