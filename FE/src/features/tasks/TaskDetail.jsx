import { useEffect, useRef, useState } from "react";
import TaskForm from "./TaskForm.jsx";
import Comments from "./Comments.jsx";
import RichEditor from "../../components/RichEditor.jsx";
import { messageFor } from "../../lib/messages.js";
import { statuses, deadline } from "../../lib/content.js";
export default function TaskDetail({ api, id }) {
  const [composing, setComposing] = useState(false);
  const [task, setTask] = useState(null),
    [project, setProject] = useState(null),
    [workspace, setWorkspace] = useState(null),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setTask(null);
    setError("");
    (async () => {
      try {
        const t = (await api.request(`/tasks/${id}`)).task,
          p = (await api.request(`/projects/${t.projectId}`)).project,
          w = (await api.request(`/workspaces/${t.workspaceId}`)).workspace;
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
    if (pending.current) return;
    if (
      !status &&
      !confirm(
        "Xóa Task và ngừng truy cập các bình luận? Thao tác không có khôi phục trong ứng dụng.",
      )
    )
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.request(
        `/tasks/${id}/` + (status ? "status" : "delete"),
        {
          method: status ? "PATCH" : "POST",
          body: {
            expectedVersion: task.version,
            ...(status ? { status } : {}),
          },
        },
      );
      if (status) {
        setTask(result.task);
        setNotice("Đã đổi trạng thái Task.");
      } else location.hash = `project/${task.projectId}`;
    } catch (e) {
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
    <main>
      <p className="breadcrumbs">
        <a href="#home">Trang chủ</a>
        {workspace && (
          <>
            {" "}
            / <a href={`#workspace/${workspace.id}`}>{workspace.name}</a>
          </>
        )}
        {project && (
          <>
            {" "}
            / <a href={`#project/${project.id}`}>{project.name}</a>
          </>
        )}{" "}
        / Task
      </p>
      {!editing && (
        <button
          disabled={busy || composing}
          onClick={() => {
            setNotice("");
            setRevision((v) => v + 1);
          }}
        >
          Làm mới Task
        </button>
      )}
      {busy && <p role="status">Đang xử lý Task…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {task && (
        <>
          <section className="hero">
            <div>
              <small>CHI TIẾT CÔNG VIỆC</small>
              <h1>{task.title}</h1>
              <span className="badge">{statuses[task.status]}</span>
            </div>
            {!editing && (
              <div className="buttons">
                {task.permissions.edit && (
                  <button
                    disabled={busy || composing}
                    onClick={() => setEditing(true)}
                  >
                    Sửa Task
                  </button>
                )}
                {task.permissions.delete && (
                  <button disabled={busy || composing} onClick={() => action()}>
                    Xóa Task
                  </button>
                )}
              </div>
            )}
          </section>
          {project.state === "archived" && (
            <p className="archive-banner">
              Dự án đã lưu trữ · Task và bình luận chỉ đọc.
            </p>
          )}
          {editing ? (
            <TaskForm
              key={task.version}
              api={api}
              task={task}
              workspaceId={task.workspaceId}
              onCancel={() => setEditing(false)}
              onDone={(t) => {
                setTask(t);
                setEditing(false);
                setNotice("Đã lưu Task.");
              }}
            />
          ) : (
            <>
              <section className="project-info">
                <div className="task-meta">
                  <label>
                    Trạng thái
                    <select
                      aria-label="Trạng thái"
                      disabled={!task.permissions.status || busy || composing}
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
                  <p>
                    Người thực hiện:{" "}
                    <strong>
                      {task.assignee?.displayName ?? "Chưa phân công"}
                      {task.assigneeLeft && " · Đã rời"}
                    </strong>
                  </p>
                  <p>
                    Deadline: {deadline(task.dueAt)}{" "}
                    {task.overdue && (
                      <strong className="overdue">Quá hạn</strong>
                    )}
                  </p>
                  <p>Người tạo: {task.creator?.displayName}</p>
                </div>
                <h2>Mô tả</h2>
                <RichEditor
                  key={task.version}
                  value={task.description}
                  readOnly
                  label="Mô tả Task"
                />
              </section>
              <Comments
                onComposing={setComposing}
                api={api}
                taskId={id}
                readOnly={project.state === "archived"}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}
