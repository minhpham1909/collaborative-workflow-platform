import {
  confirmDialog,
  notify,
} from "../../components/NotificationProvider.jsx";
import ProjectDescriptionEditor from "./ProjectDescriptionEditor.jsx";
import RichEditor from "../../components/RichEditor.jsx";
import Icon from "../../components/Icon.jsx";
import { useEffect, useRef, useState } from "react";
import NameDialog from "../../components/NameDialog.jsx";
import { messageFor } from "../../lib/messages.js";
import TaskList from "../tasks/TaskList.jsx";

export default function Project({ api, id, user }) {
  const [project, setProject] = useState(null),
    [workspace, setWorkspace] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [editing, setEditing] = useState(false),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setError("");
    setEditingDescription(false);
    setProject(null);
    setWorkspace(null);
    (async () => {
      try {
        const data = await api.request(`/projects/${id}`);
        const context = await api.request(
          `/workspaces/${data.project.workspaceId}`,
        );
        if (live) {
          setProject(data.project);
          setWorkspace(context.workspace);
        }
      } catch (e) {
        if (live) setError(messageFor(e));
      } finally {
        if (live) setBusy(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [id, revision]);
  async function changeState() {
    if (pending.current) return;
    const state = project.state === "active" ? "archived" : "active";
    if (
      !(await confirmDialog(
        state === "archived"
          ? "Lưu trữ Dự án? Mọi Task và bình luận sẽ chuyển sang chỉ đọc."
          : "Mở lại Dự án để tiếp tục làm việc?",
      ))
    )
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.request(`/projects/${id}/state`, {
        method: "PATCH",
        body: { expectedVersion: project.version, state },
      });
      setProject(result.project);
      notify("Đã cập nhật trạng thái Dự án.");
      setNotice(
        state === "archived" ? "Đã lưu trữ Dự án." : "Đã mở lại Dự án.",
      );
    } catch (e) {
      setError(
        e.status
          ? messageFor(e)
          : "Chưa xác nhận kết quả. Tải lại dữ liệu trước khi thao tác lại.",
      );
      if (e.status === 403 || e.status === 404) {
        setProject(null);
        setWorkspace(null);
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="studio-project-page">
      <p className="breadcrumbs">
        <a href="#home">Trang chủ</a>
        {workspace && (
          <>
            {" "}
            / <a href={`#workspace/${workspace.id}`}>{workspace.name}</a>
          </>
        )}{" "}
        / Dự án
      </p>
      <button
        disabled={busy || editingDescription}
        onClick={() => {
          setEditing(false);
          setNotice("");
          setRevision((v) => v + 1);
        }}
      >
        Làm mới Dự án
      </button>
      {error && (
        <div role="alert" className="error">
          {error}{" "}
          <button
            disabled={busy}
            onClick={() => {
              setEditing(false);
              setNotice("");
              setRevision((v) => v + 1);
            }}
          >
            Tải lại dữ liệu
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {busy && <p role="status">Đang xử lý Dự án…</p>}
      {project && (
        <>
          <section className="hero board-project-header">
            <div>
              <small>DỰ ÁN CỦA ĐỘI NGŨ</small>
              <h1 className="project-title">
                <span className="project-type-icon">
                  <Icon name={project.icon ?? "folder"} />
                </span>
                {project.name}
              </h1>
              <span className="badge">
                {project.state === "archived"
                  ? "Đã lưu trữ · Chỉ đọc"
                  : "Đang hoạt động"}
              </span>
            </div>
            {workspace.role === "owner" && (
              <div className="buttons">
                {project.state === "active" && (
                  <button
                    disabled={busy || editingDescription}
                    onClick={() => setEditing(true)}
                  >
                    Đổi tên
                  </button>
                )}
                <button
                  disabled={busy || editingDescription}
                  onClick={changeState}
                >
                  {project.state === "active"
                    ? "Lưu trữ Dự án"
                    : "Mở lại Dự án"}
                </button>
              </div>
            )}
          </section>
          {project.state === "archived" && (
            <p className="archive-banner">
              Dự án chỉ đọc. Owner có thể mở lại để tiếp tục chỉnh sửa.
            </p>
          )}
          <section className="project-info project-scope">
            <div className="section-heading">
              <h2>Mục tiêu & mô tả Dự án</h2>
              {project.state === "active" &&
                (workspace.role === "owner" ||
                  project.createdBy === user?.id) &&
                !editingDescription && (
                  <button onClick={() => setEditingDescription(true)}>
                    Chỉnh sửa mô tả Dự án
                  </button>
                )}
            </div>
            {editingDescription ? (
              <ProjectDescriptionEditor
                api={api}
                project={project}
                onDone={(project) => {
                  setProject(project);
                  setEditingDescription(false);
                }}
                onCancel={(uncertain) => {
                  setEditingDescription(false);
                  if (uncertain) setRevision((value) => value + 1);
                }}
              />
            ) : (
              <div>
                {project.description?.plainText ? (
                  <RichEditor
                    value={project.description}
                    readOnly
                    label="Mô tả Dự án"
                    limit={10000}
                  />
                ) : (
                  <p>Dự án chưa có mô tả.</p>
                )}
              </div>
            )}
            <p className="muted">
              Tạo{" "}
              {new Date(project.createdAt).toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
          </section>
          <TaskList
            api={api}
            project={project}
            workspaceId={project.workspaceId}
          />
        </>
      )}
      {editing && project && (
        <NameDialog
          title="Đổi tên Dự án"
          initial={project.name}
          withIcon
          initialIcon={project.icon ?? "folder"}
          onClose={(uncertain) => {
            setEditing(false);
            if (uncertain) setRevision((v) => v + 1);
          }}
          onSave={async (name, icon) => {
            const data = await api.request(`/projects/${id}`, {
              method: "PATCH",
              body: { expectedVersion: project.version, name, icon },
            });
            setProject(data.project);
            setNotice("Đã cập nhật tên Dự án.");
          }}
        />
      )}
    </main>
  );
}
