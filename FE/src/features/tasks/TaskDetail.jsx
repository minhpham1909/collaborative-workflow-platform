import { InlineMessage, LoadingState } from "../../components/Feedback.jsx";
import { confirmDialog, inputDialog } from "../../components/NotificationProvider.jsx";
import PersonProfile from "../../components/PersonProfile.jsx";
import { useEffect, useRef, useState } from "react";
import TaskForm from "./TaskForm.jsx";
import Comments from "./Comments.jsx";
import RichEditor from "../../components/RichEditor.jsx";
import TaskChecklist from './TaskChecklist.jsx';
import TaskActivity from './TaskActivity.jsx';
import TaskReopen from './TaskReopen.jsx';
import { myTaskReturn } from './my-task-filters.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import './task-detail.css';
import { useDraftGuard } from '../../lib/draft-navigation.js';
import { messageFor } from "../../lib/messages.js";
import { statuses, deadline } from "../../lib/content.js";
export default function TaskDetail({ api, id, expectedProjectId, onBusyChange, onDeleted, onReturnProject, onReturnMine, returnTo = myTaskReturn() }) {
  const [composing, setComposing] = useState(false);
  const [checklistComposing, setChecklistComposing] = useState(false), [uncertain, setUncertain] = useState(false);
  const blocked = composing || checklistComposing;
  const [deleted, setDeleted] = useState(false);
  const [task, setTask] = useState(null),
    [project, setProject] = useState(null),
    [workspace, setWorkspace] = useState(null),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const pending = useRef(false);
  useEffect(() => { if (deleted && !busy) { if (onDeleted) onDeleted(); else location.hash = returnTo ?? `project/${task.projectId}`; } }, [deleted, busy]);
  useDraftGuard({ dirty: false, busy: busy && pending.current, message: 'Task đang xử lý.' });
  useEffect(() => { onBusyChange?.(busy && pending.current); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setTask(null);
    setError("");
    setUncertain(false);
    (async () => {
      try {
        const t = (await api.request(`/tasks/${id}`)).task;
        if (expectedProjectId && t.projectId !== expectedProjectId) throw Object.assign(new Error('RESOURCE_UNAVAILABLE'), { code: 'RESOURCE_UNAVAILABLE', status: 404 });
        const
          p = (await api.request(`/projects/${t.projectId}`)).project,
          w = p.accessRole === "guest" ? null : (await api.request(`/workspaces/${t.workspaceId}`)).workspace;
        if (live) {
          setTask(t);
          setProject(p);
          setWorkspace(w);
        }
      } catch (e) {
        if (live) {
          setProject(null);
          setWorkspace(null);
          setError(messageFor(e));
        }
      } finally {
        if (live) setBusy(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [id, revision]);
  async function action(status) {
    if (pending.current || uncertain) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
    let reason, confirmIncompleteChecklist = false;
    if (task.status === "done" && status && status !== "done") {
      reason = await inputDialog("Lý do mở lại Task để tiếp tục xử lý", "", { title: "Mở lại Task", inputLabel: "Lý do", maxLength: 2000, confirmLabel: "Mở lại Task" });
      if (reason === null) return;
      if (!reason.trim() || reason.length > 2000) { setError("Nhập lý do mở lại, tối đa 2.000 ký tự."); return; }
    }
    if (status === "done" && task.status !== "done" && task.checklist?.some(item => !item.checked)) {
      confirmIncompleteChecklist = await confirmDialog("Checklist vẫn còn mục chưa hoàn thành. Bạn muốn chuyển Task sang Hoàn thành?", { title: "Checklist chưa hoàn thành", confirmLabel: "Vẫn hoàn thành" });
      if (!confirmIncompleteChecklist) return;
    }
    if (
      !status &&
      !(await confirmDialog(
        "Chuyển Task vào thùng rác và ẩn khỏi danh sách cùng bình luận? Dữ liệu được giữ 30 ngày trước khi dọn vĩnh viễn.",
        { title: "Xóa Task?", confirmLabel: "Xóa Task", tone: "danger" },
      ))
    )
      return;
      const result = await api.request(
        `/tasks/${id}/` + (status ? "status" : "delete"),
        {
          method: status ? "PATCH" : "POST",
          body: {
            expectedVersion: task.version,
            ...(status ? { status } : {}),
            ...(reason ? { reason } : {}),
            ...(confirmIncompleteChecklist ? { confirmIncompleteChecklist: true } : {}),
          },
        },
      );
      if (status) {
        setTask(result.task);
        setNotice("Đã đổi trạng thái Task.");
      } else setDeleted(true);
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        e.status
          ? messageFor(e)
          : "Chưa xác nhận thao tác. Tải lại dữ liệu trước khi thử lại.",
      );
      if (e.status === 404) {
        setTask(null);
        setProject(null);
        setWorkspace(null);
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="studio-task-detail">
      <p className="breadcrumbs">
        <a href="#home">Trang chủ</a>
        {returnTo && <> / <a href={returnTo} onClick={event=>{if(onReturnMine){event.preventDefault();onReturnMine();}}}>Công việc của tôi</a></>}
        {project?.accessRole === "guest" && <> / <a href="#shared">Dự án được chia sẻ</a> / <span>{project.context?.workspaceName ?? "Project được chia sẻ"}</span></>}
        {workspace && (
          <>
            {" "}
            / <a href={`#workspace/${workspace.id}`}>{workspace.name}</a>
          </>
        )}
        {project && (
          <>
            {" "}
            / <a href={`#project/${project.id}`} onClick={event => { if (onReturnProject) { event.preventDefault(); onReturnProject(); } }}>{project.name}</a>
          </>
        )}{" "}
        / Task
      </p>
      {!task && (
        <button
          disabled={busy || blocked}
          onClick={async () => {
            setNotice("");
            setRevision((v) => v + 1);
          }}
        >
          Làm mới Task
        </button>
      )}
      {busy && <LoadingState>Đang xử lý Task…</LoadingState>}
      {error && <InlineMessage>{error}</InlineMessage>}
      {notice && <InlineMessage tone="info">{notice}</InlineMessage>}
      {task && (
        <>
          <section className="hero task-detail-header">
            <div>
              <small>CHI TIẾT CÔNG VIỆC</small>
              <h1>{task.title}</h1>
              <span className="badge">{statuses[task.status]}</span>
            </div>
            {!editing && (
              <div className="buttons">
                <button
                  disabled={busy || blocked}
                  onClick={async () => {
                    setNotice("");
                    setRevision((v) => v + 1);
                  }}
                >
                  Làm mới Task
                </button>
                {task.permissions.edit && (
                  <button
                    disabled={busy || blocked || uncertain}
                    onClick={() => setEditing(true)}
                  >
                    Sửa Task
                  </button>
                )}
                {task.permissions.delete && (
                  <button disabled={busy || blocked || uncertain} onClick={() => action()}>
                    Xóa Task
                  </button>
                )}
              </div>
            )}
          </section>
          {(project.readOnly ?? project.state === "archived") && (
            <InlineMessage tone="info" className="archive-banner">
              Dự án hoặc Workspace đang lưu trữ. Nội dung chỉ đọc; người có quyền vẫn có thể gỡ bình luận vi phạm.
            </InlineMessage>
          )}
          {editing ? (
            <TaskForm
              key={task.version}
              api={api}
              task={task}
              workspaceId={task.workspaceId}
              onCancel={(uncertain) => {
                setEditing(false);
                if (uncertain) setRevision((v) => v + 1);
              }}
              onDone={(t) => {
                setTask(t);
                setEditing(false);
                setNotice("Đã lưu Task.");
              }}
            />
          ) : (
            <>
              <section className="project-info">
                <div className="task-detail-identifiers"><span>{task.code ?? 'Task chưa có mã lịch sử'}</span><span className={'task-priority priority-'+task.priority}>{({low:'Ưu tiên thấp',medium:'Ưu tiên vừa',high:'Ưu tiên cao'})[task.priority]}</span>{task.labels?.map(label => <span key={label.id}>{label.name}{label.archivedAt ? ' · Đã lưu trữ' : ''}</span>)}</div>
                <div className="task-meta detail-meta-grid">
                  <label>
                    Trạng thái
                    <select
                      aria-label="Trạng thái"
                      disabled={!task.permissions.status || busy || blocked || uncertain || (task.status === 'done' && Boolean(task.pendingReopenRequestId))}
                      value={task.status}
                      onChange={(e) => action(e.target.value)}
                    >
                      {Object.entries(statuses).map(([v, l]) => (
                        <option value={v} key={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="detail-person">
                    Người thực hiện:{" "}
                    <strong>
                      {task.assignee ? <PersonProfile api={api} projectId={task.projectId} user={task.assignee} /> : "Chưa phân công"}
                    </strong>
                  </p>
                  <p>
                    Deadline: {deadline(task.dueAt)}{" "}
                    {task.overdue && (
                      <strong className="overdue">Quá hạn</strong>
                    )}
                  </p>
                  <p className="detail-person">
                    Người tạo:{" "}
                    <strong>
                      {task.creator && <PersonProfile api={api} projectId={task.projectId} user={task.creator} />}
                    </strong>
                  </p>
                  <p>
                    Tạo:{" "}
                    <strong>
                      {new Date(task.createdAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </strong>
                  </p>
                  <p>
                    Cập nhật:{" "}
                    <strong>
                      {new Date(task.updatedAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </strong>
                  </p>
                </div>
                {task.status === 'done' && <p>Hoàn thành: {task.completedAt ? new Date(task.completedAt).toLocaleString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh' }) : 'Chưa ghi nhận ngày hoàn thành'}</p>}
                <h2>Mô tả</h2>
                <RichEditor
                  key={task.version}
                  value={task.description}
                  readOnly
                  label="Mô tả Task"
                />
              </section>
              <TaskChecklist api={api} task={task} disabled={busy || blocked || uncertain} onComposing={setChecklistComposing} onTask={value => { if (value) setTask(value); else setRevision(v => v+1); }} />
              {project.accessRole !== 'guest' && <TaskReopen api={api} task={task} disabled={busy || blocked || uncertain} onTask={value => { if (value) setTask(value); else setRevision(v => v+1); }} />}
              <Comments
                onComposing={setComposing}
                api={api}
                taskId={id}
                projectId={project.id}
                readOnly={project.readOnly ?? project.state === "archived"}
                disabled={checklistComposing || busy || uncertain}
              />
              <TaskActivity api={api} task={task} />
            </>
          )}
        </>
      )}
    </main>
  );
}
