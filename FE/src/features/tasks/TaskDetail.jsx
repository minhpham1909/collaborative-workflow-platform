import useLiveRefresh from '../../lib/useLiveRefresh.js';
import {calendarReturn} from './calendar-state.js';
import {inboxReturn} from '../notifications/inbox-filters.js';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { taskText } from '../../lib/task-text.js';
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
export default function TaskDetail({ api, id, expectedProjectId, onBusyChange, onDeleted, onReturnProject, onReturnMine, returnTo = myTaskReturn() ?? calendarReturn() ?? (new URLSearchParams(location.hash.split('?')[1]??'').get('returnTo')?.split('?')[0]==='#notifications'?inboxReturn():null) }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => taskText(value, locale, values);
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
  useLiveRefresh(() => setRevision(value => value + 1));
  const pending = useRef(false);
  useEffect(() => { if (deleted && !busy) { if (onDeleted) onDeleted(); else location.hash = returnTo ?? `project/${task.projectId}`; } }, [deleted, busy]);
  useDraftGuard({ dirty: false, busy: busy && pending.current, message: tr("Task đang xử lý.") });
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
      reason = await inputDialog(tr("Lý do mở lại Task để tiếp tục xử lý"), "", { title: tr("Mở lại Task"), inputLabel: tr("Lý do"), maxLength: 2000, confirmLabel: tr("Mở lại Task") });
      if (reason === null) return;
      if (!reason.trim() || reason.length > 2000) { setError(tr("Nhập lý do mở lại, tối đa 2.000 ký tự.")); return; }
    }
    if (status === "done" && task.status !== "done" && task.checklist?.some(item => !item.checked)) {
      confirmIncompleteChecklist = await confirmDialog(tr("Checklist vẫn còn mục chưa hoàn thành. Bạn muốn chuyển Task sang Hoàn thành?"), { title: tr("Checklist chưa hoàn thành"), confirmLabel: tr("Vẫn hoàn thành") });
      if (!confirmIncompleteChecklist) return;
    }
    if (
      !status &&
      !(await confirmDialog(
        tr("Chuyển Task vào thùng rác và ẩn khỏi danh sách cùng bình luận? Dữ liệu được giữ 30 ngày trước khi dọn vĩnh viễn."),
        { title: tr("Xóa Task?"), confirmLabel: tr("Xóa Task"), tone: "danger" },
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
        setNotice(tr("Đã đổi trạng thái Task."));
      } else setDeleted(true);
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        e.status
          ? messageFor(e)
          : tr("Chưa xác nhận thao tác. Tải lại dữ liệu trước khi thử lại."),
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
        <a href="#home">{tr("Trang chủ")}</a>
        {returnTo && <> / <a href={returnTo} onClick={event=>{if(onReturnMine){event.preventDefault();onReturnMine();}}}>{tr(returnTo?.startsWith('#notifications')?"Thông báo":returnTo?.startsWith('#calendar')?"Lịch công việc":"Công việc của tôi")}</a></>}
        {project?.accessRole === "guest" && <> / <a href="#shared">{tr("Dự án được chia sẻ")}</a> / <span>{project.context?.workspaceName ?? tr("Project được chia sẻ")}</span></>}
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

      {busy && <LoadingState>{tr("Đang xử lý Task…")}</LoadingState>}
      {error && <InlineMessage>{tr(error)}<button disabled={busy} onClick={()=>setRevision(v=>v+1)}>{tr("Thử lại")}</button></InlineMessage>}
      {notice && <InlineMessage tone="info">{tr(notice)}</InlineMessage>}
      {task && (
        <>
          <section className="hero task-detail-header">
            <div>
              <small>{tr("CHI TIẾT CÔNG VIỆC")}</small>
              <h1>{task.title}</h1>
              <span className="badge">{tr(statuses[task.status])}</span>
            </div>
            {!editing && (
              <div className="buttons">

                {task.permissions.edit && (
                  <button
                    disabled={busy || blocked || uncertain}
                    onClick={() => setEditing(true)}
                  >{tr("Sửa Task")}</button>
                )}
                {task.permissions.delete && (
                  <button disabled={busy || blocked || uncertain} onClick={() => action()}>{tr("Xóa Task")}</button>
                )}
              </div>
            )}
          </section>
          {(project.readOnly ?? project.state === "archived") && (
            <InlineMessage tone="info" className="archive-banner">{tr("Dự án hoặc Workspace đang lưu trữ. Nội dung chỉ đọc; người có quyền vẫn có thể gỡ bình luận vi phạm.")}</InlineMessage>
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
                setNotice(tr("Đã lưu Task."));
              }}
            />
          ) : (
            <>
              <section className="project-info">
                <div className="task-detail-identifiers"><span>{task.code ?? tr("Task chưa có mã lịch sử")}</span><span className={'task-priority priority-'+task.priority}>{({low:tr("Ưu tiên thấp"),medium:tr("Ưu tiên vừa"),high:tr("Ưu tiên cao")})[task.priority]}</span>{task.labels?.map(label => <span key={label.id}>{label.name}{label.archivedAt ? tr(" · Đã lưu trữ") : ''}</span>)}</div>
                <div className="task-meta detail-meta-grid">
                  <label>{tr("Trạng thái")}<select
                      aria-label={tr("Trạng thái")}
                      disabled={!task.permissions.status || busy || blocked || uncertain || (task.status === 'done' && Boolean(task.pendingReopenRequestId))}
                      value={task.status}
                      onChange={(e) => action(e.target.value)}
                    >
                      {Object.entries(statuses).map(([v, l]) => (
                        <option value={v} key={v}>
                          {tr(l)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="detail-person">
                    {tr("Người thực hiện:")}{" "}
                    <strong>
                      {task.assignee ? <PersonProfile locale={locale} api={api} projectId={task.projectId} user={task.assignee} /> : tr("Chưa phân công")}
                    </strong>
                  </p>
                  <p>
                    Deadline: {task.dueAt ? new Date(task.dueAt).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }) : tr("Không có hạn")}{" "}
                    {task.overdue && (
                      <strong className="overdue">{tr("Quá hạn")}</strong>
                    )}
                  </p>
                  <p className="detail-person">
                    {tr("Người tạo:")}{" "}
                    <strong>
                      {task.creator && <PersonProfile locale={locale} api={api} projectId={task.projectId} user={task.creator} />}
                    </strong>
                  </p>
                  <p>
                    {tr("Tạo:")}{" "}
                    <strong>
                      {new Date(task.createdAt).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </strong>
                  </p>
                  <p>
                    {tr("Cập nhật:")}{" "}
                    <strong>
                      {new Date(task.updatedAt).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </strong>
                  </p>
                </div>
                {task.status === 'done' && <p>{tr("Hoàn thành:")} {task.completedAt ? new Date(task.completedAt).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", { timeZone:'Asia/Ho_Chi_Minh' }) : tr("Chưa ghi nhận ngày hoàn thành")}</p>}
                <h2>{tr("Mô tả")}</h2>
                <RichEditor
              locale={locale}
                  key={task.version}
                  value={task.description}
                  readOnly
                  label={tr("Mô tả Task")}
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
