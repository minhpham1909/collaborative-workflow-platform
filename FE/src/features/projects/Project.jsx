import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { projectText } from '../../lib/project-text.js';
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
import ProjectTrash from './ProjectTrash.jsx';
import TaskPanel from '../tasks/TaskPanel.jsx';
import { workspaceRoleLabel } from '../../lib/ui-copy.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import './project.css';

export default function Project({ api, id, user, section }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => projectText(value, locale, values);
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
  const showTrash = section === 'trash';
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
          ? t("Lưu trữ Dự án? Mọi Task và bình luận sẽ chuyển sang chỉ đọc.")
          : t("Mở lại Dự án để tiếp tục làm việc?"),
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
      notify(t("Đã cập nhật trạng thái Dự án."));
      setNotice(
        state === "archived" ? t("Đã lưu trữ Dự án.") : t("Đã mở lại Dự án."),
      );
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        e.status
          ? messageFor(e)
          : t("Chưa xác nhận kết quả. Tải lại dữ liệu trước khi thao tác lại."),
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
    <main lang={locale} className="studio-project-page">
      <p className="breadcrumbs">
        <a href="#home">{t("Trang chủ")}</a>
        {project?.accessRole === "guest" && <> / <a href="#shared">{t("Dự án được chia sẻ")}</a> / <span>{project.context?.workspaceName ?? t("Project được chia sẻ")}</span></>}
        {workspace && (
          <>
            {workspace.organizationId && <> / <a href={`#organization/${workspace.organizationId}`}>{t("Tổ chức")}</a></>}
            {" "}
            / <a href={`#workspace/${workspace.id}`}>{workspace.name}</a>
          </>
        )}{" "}
        / {t("Dự án")}
      </p>
      {!project && (
        <button
          disabled={busy || editingDescription || taskComposing}
          onClick={() => {
            setEditing(false);
            setNotice("");
            setRevision((v) => v + 1);
          }}
        >{t("Làm mới Dự án")}</button>
      )}

      {error && (
        <InlineMessage>
          {t(error)}{" "}
          <button
            disabled={busy || editingDescription || taskComposing}
            onClick={() => {
              setEditing(false);
              setNotice("");
              setRevision((v) => v + 1);
            }}
          >{t("Tải lại dữ liệu")}</button>
        </InlineMessage>
      )}
      {notice && <InlineMessage tone="info">{t(notice)}</InlineMessage>}
      {busy && <LoadingState>{t("Đang xử lý Dự án…")}</LoadingState>}
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
                  ? (project.state === 'archived' ? t("Dự án lưu trữ · Chỉ đọc") : t("Workspace lưu trữ · Chỉ đọc"))
                  : t("Đang hoạt động")}
              </span>
              <span className="project-role">{project.accessRole === 'guest' ? t("Guest · Xem và bình luận") : project.accessRole === 'lead' ? 'Project Lead' : workspaceRoleLabel(project.accessRole, locale)}</span>
              <span className="project-created muted">
                {t("Tạo")}{" "}
                {new Date(project.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN", {
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
              >{t("Làm mới Dự án")}</button>
              {project.accessRole !== 'guest' && <a className="project-trash-link" href={`#project/${id}${showTrash ? '' : '/trash'}`} aria-current={showTrash ? 'page' : undefined}>{showTrash ? t("Về Board") : t("Thùng rác Task")}</a>}
              {(project.permissions?.manageAccess || project.permissions?.manageLabels) && <button disabled={busy || uncertain || editingDescription || taskComposing} onClick={() => { location.hash = `project/${id}${showManagement ? '' : '/manage'}`; }}>{showManagement ? t("Về Board") : t("Quản lý Project")}</button>}
              {project.permissions?.manageProject && (
                <>
                  {project.state === "active" && (
                    <button
                      disabled={busy || uncertain || editingDescription || taskComposing}
                      onClick={() => setEditing(true)}
                    >{t("Đổi tên")}</button>
                  )}
                  <button
                    disabled={busy || uncertain || editingDescription || taskComposing}
                    onClick={changeState}
                  >
                    {project.state === "active"
                      ? t("Lưu trữ Dự án")
                      : t("Mở lại Dự án")}
                  </button>
                </>
              )}
            </div>
          </section>
          {!showManagement && !showTrash && <ProjectOverview locale={locale} data={statistics} />}
          {(project.readOnly ?? project.state === "archived") && (
            <InlineMessage tone="info" className="archive-banner">{t("Dự án hoặc Workspace đang được lưu trữ nên chỉ đọc. Quản lý cần mở lại phạm vi tương ứng để tiếp tục chỉnh sửa.")}</InlineMessage>
          )}
          {!showTrash && <section className="project-info project-scope">
            <div className="section-heading">
              <h2>{t("Mục tiêu & mô tả Dự án")}</h2>
              {project.state === "active" &&
                project.permissions?.editDescription &&
                !editingDescription && (
                  <button
                    disabled={taskComposing || busy || uncertain}
                    onClick={() => setEditingDescription(true)}
                  >{t("Chỉnh sửa mô tả Dự án")}</button>
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
                    locale={locale}
                    key={project.id + ":" + project.version}
                    value={project.description}
                    label={t("Mô tả Dự án")}
                    limit={10000}
                  />
                ) : (
                  <p>{t("Dự án chưa có mô tả.")}</p>
                )}
              </div>
            )}
          </section>}
          {showTrash && <ProjectTrash key={id} api={api} project={project} onContext={setProject} onUnavailable={unavailable} onBusyChange={setTaskComposing} />}
          {showManagement && !showTrash && <ProjectManagement api={api} project={project} onContext={setProject} onUnavailable={unavailable} />}
          {!editingDescription && !showManagement && !showTrash && (
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
          locale={locale}
          title={t("Đổi tên Dự án")}
          label={t("Tên Dự án")}
          submitLabel={t("Lưu")}
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
            setNotice(t("Đã cập nhật tên Dự án."));
          }}
        />
      )}
      {openTask && project && <TaskPanel api={api} id={openTask} projectId={project.id} onClose={() => { setOpenTask(null); setBoardRevision(value => value+1); }} />}
    </main>
  );
}
