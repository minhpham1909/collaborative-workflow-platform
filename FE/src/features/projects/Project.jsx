import { InlineMessage, LoadingState } from "../../components/Feedback.jsx";
import {
  confirmDialog,
  notify,
} from "../../components/NotificationProvider.jsx";
import ProjectDescriptionEditor from "./ProjectDescriptionEditor.jsx";
import DescriptionPreview from "../../components/DescriptionPreview.jsx";
import Icon from "../../components/Icon.jsx";
import { useEffect, useRef, useState } from "react";
import NameDialog from "../../components/NameDialog.jsx";
import { messageFor } from "../../lib/messages.js";
import TaskList from "../tasks/TaskList.jsx";
import ProjectOverview from './ProjectOverview.jsx';
import ProjectManagement from './ProjectManagement.jsx';
import TaskPanel from '../tasks/TaskPanel.jsx';
import { workspaceRoleLabel } from '../../lib/ui-copy.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import './project.css';

export default function Project({ api, id, user, section }) {
  const [project, setProject] = useState(null),
    [workspace, setWorkspace] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [editing, setEditing] = useState(false),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [taskComposing, setTaskComposing] = useState(false);
  const [managing, setManaging] = useState(section === 'manage');
  const [openTask, setOpenTask] = useState(null), [boardRevision, setBoardRevision] = useState(0);
  useEffect(() => setManaging(section === 'manage'), [section]);
  const [statistics, setStatistics] = useState(null), [uncertain, setUncertain] = useState(false);
  const unavailable = error => { setProject(null); setWorkspace(null); setError(messageFor(error)); };
  const pending = useRef(false);
  const showManagement = managing && Boolean(project?.permissions?.manageAccess || project?.permissions?.manageLabels);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setError("");
    setUncertain(false);
    setEditingDescription(false);
    setProject(null);
    setStatistics(null);
    setWorkspace(null);
    (async () => {
      try {
        const data = await api.request(`/projects/${id}`);
        const context = data.project.accessRole === "guest" ? null : await api.request(`/workspaces/${data.project.workspaceId}`);
        if (live) {
          setProject(data.project);
          setWorkspace(context?.workspace ?? null);
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
    if (pending.current || uncertain || !project.permissions?.manageProject) return;
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
      setUncertain(isUncertainMutation(e));
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
        {project?.accessRole === "guest" && <> / <a href="#shared">Dự án được chia sẻ</a> / <span>{project.context?.workspaceName ?? "Project được chia sẻ"}</span></>}
        {workspace && (
          <>
            {workspace.organizationId && <> / <a href={`#organization/${workspace.organizationId}`}>Tổ chức</a></>}
            {" "}
            / <a href={`#workspace/${workspace.id}`}>{workspace.name}</a>
          </>
        )}{" "}
        / Dự án
      </p>
      {!project && (
        <button
          disabled={busy || editingDescription || taskComposing}
          onClick={() => {
            setEditing(false);
            setNotice("");
            setRevision((v) => v + 1);
          }}
        >
          Làm mới Dự án
        </button>
      )}

      {error && (
        <InlineMessage>
          {error}{" "}
          <button
            disabled={busy || editingDescription || taskComposing}
            onClick={() => {
              setEditing(false);
              setNotice("");
              setRevision((v) => v + 1);
            }}
          >
            Tải lại dữ liệu
          </button>
        </InlineMessage>
      )}
      {notice && <InlineMessage tone="info">{notice}</InlineMessage>}
      {busy && <LoadingState>Đang xử lý Dự án…</LoadingState>}
      {project && (
        <>
          <section className="hero board-project-header">
            <div>
              <h1 className="project-title">
                <span className="project-type-icon">
                  <Icon name={project.icon ?? "folder"} />
                </span>
                {project.name}
              </h1>
              <span className={"badge state-" + (project.readOnly ? 'archived' : project.state)}>
                {project.readOnly
                  ? (project.state === 'archived' ? "Dự án lưu trữ · Chỉ đọc" : "Workspace lưu trữ · Chỉ đọc")
                  : "Đang hoạt động"}
              </span>
              <span className="project-role">{project.accessRole === 'guest' ? 'Guest · Xem và bình luận' : project.accessRole === 'lead' ? 'Project Lead' : workspaceRoleLabel(project.accessRole)}</span>
              <span className="project-created muted">
                Tạo{" "}
                {new Date(project.createdAt).toLocaleDateString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </span>
            </div>
            <div className="buttons">
              <button
                disabled={busy || editingDescription || taskComposing}
                onClick={() => {
                  setEditing(false);
                  setNotice("");
                  setRevision((v) => v + 1);
                }}
              >
                Làm mới Dự án
              </button>
              {(project.permissions?.manageAccess || project.permissions?.manageLabels) && <button disabled={busy || uncertain || editingDescription || taskComposing} onClick={() => { location.hash = `project/${id}${showManagement ? '' : '/manage'}`; }}>{showManagement ? 'Về Board' : 'Quản lý Project'}</button>}
              {project.permissions?.manageProject && (
                <>
                  {project.state === "active" && (
                    <button
                      disabled={busy || uncertain || editingDescription || taskComposing}
                      onClick={() => setEditing(true)}
                    >
                      Đổi tên
                    </button>
                  )}
                  <button
                    disabled={busy || uncertain || editingDescription || taskComposing}
                    onClick={changeState}
                  >
                    {project.state === "active"
                      ? "Lưu trữ Dự án"
                      : "Mở lại Dự án"}
                  </button>
                </>
              )}
            </div>
          </section>
          {!showManagement && <ProjectOverview data={statistics} />}
          {(project.readOnly ?? project.state === "archived") && (
            <InlineMessage tone="info" className="archive-banner">
              Dự án hoặc Workspace đang được lưu trữ nên chỉ đọc. Quản lý cần mở lại phạm vi tương ứng để tiếp tục chỉnh sửa.
            </InlineMessage>
          )}
          <section className="project-info project-scope">
            <div className="section-heading">
              <h2>Mục tiêu & mô tả Dự án</h2>
              {project.state === "active" &&
                project.permissions?.editDescription &&
                !editingDescription && (
                  <button
                    disabled={taskComposing || busy || uncertain}
                    onClick={() => setEditingDescription(true)}
                  >
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
                  <DescriptionPreview
                    key={project.id + ":" + project.version}
                    value={project.description}
                    label="Mô tả Dự án"
                    limit={10000}
                  />
                ) : (
                  <p>Dự án chưa có mô tả.</p>
                )}
              </div>
            )}
          </section>
          {showManagement && <ProjectManagement api={api} project={project} onContext={setProject} onUnavailable={unavailable} />}
          {!editingDescription && !showManagement && (
            <TaskList
              api={api}
              project={project}
              workspaceId={project.workspaceId}
              onComposing={setTaskComposing}
              onProjectContext={setProject}
              onBoardLoaded={setStatistics}
              onUnavailable={unavailable}
              suspended={uncertain}
              refreshKey={boardRevision}
              onOpenTask={setOpenTask}
            />
          )}
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
      {openTask && project && <TaskPanel api={api} id={openTask} projectId={project.id} onClose={() => { setOpenTask(null); setBoardRevision(value => value+1); }} />}
    </main>
  );
}
