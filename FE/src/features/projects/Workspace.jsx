import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workspaceText } from '../../lib/workspace-text.js';
import {
  EmptyState,
  InlineMessage,
  LoadingState,
} from "../../components/Feedback.jsx";
import { useDraftGuard } from "../../lib/draft-navigation.js";
import { confirmDialog, notify } from "../../components/NotificationProvider.jsx";
import { workspaceRoleLabel } from "../../lib/ui-copy.js";
import WorkspaceStateDialog from "./WorkspaceStateDialog.jsx";
import "./workspace.css";
import Icon from "../../components/Icon.jsx";
import StudioCover from "../../components/StudioCover.jsx";
import FilterPanel from "../../components/FilterPanel.jsx";
import { useEffect, useRef, useState } from "react";
import { messageFor } from "../../lib/messages.js";
import NameDialog from "../../components/NameDialog.jsx";
import Team from "./Team.jsx";
import WorkspaceSettings from "./WorkspaceSettings.jsx";
import DescriptionPreview from "../../components/DescriptionPreview.jsx";

export default function Workspace({ api, id }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => workspaceText(value, locale, values);
  const [workspace, setWorkspace] = useState(null),
    [tab, setTab] = useState("projects"),
    [state, setState] = useState("active"),
    [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [data, setData] = useState({ items: [] }),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [creating, setCreating] = useState(false),
    [changingState, setChangingState] = useState(false),
    [editing, setEditing] = useState(null),
    [revision, setRevision] = useState(0),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false);
  const canManage = workspace?.permissions?.manage === true;
  const canCreate = workspace?.permissions?.createProject === true;
  async function changeTab(value) {
    if (
      !saving &&
      (!dirty || (await confirmDialog(t("Bỏ thay đổi cài đặt chưa lưu?"))))
    ) {
      setDirty(false);
      setTab(value);
    }
  }
  useDraftGuard({
    dirty: dirty,
    busy: saving,
    message: t("Bỏ thay đổi cài đặt chưa lưu?"),
  });

  const generation = useRef(0),
    invalid = from && to && from > to;
  const query = new URLSearchParams({
    limit: "12",
    state,
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();
  async function load(cursor = null, token = generation.current) {
    setBusy(true);
    setError("");
    try {
      const context = await api.request(`/workspaces/${id}`);
      const path =
        tab === "projects"
          ? `/workspaces/${id}/projects?${query}`
          : `/workspaces/${id}/members?limit=12`;
      const result =
        tab === "projects"
          ? await api.request(
              path + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
            )
          : { items: [] };
      if (token === generation.current) {
        setWorkspace(context.workspace);
        setData((old) => ({
          ...result,
          items: cursor ? [...old.items, ...result.items] : result.items,
        }));
      }
    } catch (e) {
      if (token === generation.current) {
        setError(messageFor(e));
        setWorkspace(null);
        setCreating(false);
        setData({ items: [] });
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    const token = ++generation.current;
    setData({ items: [] });
    if (invalid && tab === "projects") {
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(() => load(null, token), 250);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [id, tab, query, revision]);
  return (
    <main lang={locale} className="studio-workspace">
      <p className="breadcrumbs">
        <a href="#home">{t("Trang chủ")}</a>{workspace?.organizationId && <> / <a href={`#organization/${workspace.organizationId}`}>{t("Tổ chức")}</a></>} / Workspace
      </p>
      {error && (
        <InlineMessage>
          {t(error)}{" "}
          <button onClick={() => setRevision((v) => v + 1)}>{t("Tải lại")}</button>
        </InlineMessage>
      )}
      {workspace && (
        <>
          <section className="hero workspace-hero">
            <div>
              <small className="home-eyebrow">{t("KHÔNG GIAN CỦA ĐỘI NGŨ")}</small>
              <h1>{workspace.name}</h1>
              <div className="workspace-meta"><span className="badge">{workspaceRoleLabel(workspace.role, locale)}</span><span>{workspace.state === "archived" ? t("Đã lưu trữ · Chỉ đọc") : t("Đang hoạt động")}</span></div>
              <div className="workspace-description">
                <div className="section-heading">
                  <strong>{t("Mô tả Workspace")}</strong>
                  {workspace.permissions?.edit && tab !== "settings" && (
                    <button
                      disabled={saving}
                      onClick={() => changeTab("settings")}
                    >
                      {t("Chỉnh sửa mô tả Workspace")}
                    </button>
                  )}
                </div>
                {workspace.description?.plainText ? (
                  <DescriptionPreview
                    locale={locale}
                    key={workspace.id + ":" + workspace.version}
                    value={workspace.description}
                    label={t("Mô tả nhóm")}
                    limit={20000}
                  />
                ) : (
                  <p className="muted">
                    {t("Workspace chưa có mô tả.")}{" "}
                    {canManage
                      ? t("Thêm mục tiêu và cách làm việc của nhóm trong Cài đặt nhóm.")
                      : t("Người quản lý có thể bổ sung mô tả cho nhóm.")}
                  </p>
                )}
              </div>
            </div>
            <div className="workspace-actions">
            {tab === "projects" && <button disabled={busy || saving || dirty} onClick={() => setRevision(v => v + 1)}><Icon name="refresh" />{t("Làm mới")}</button>}
            {canCreate && tab === "projects" && (
              <button
                className="primary"
                disabled={busy}
                onClick={() => setCreating(true)}
              >
                <Icon name="plus" />{t("Tạo Dự án")}
              </button>
            )}
            {workspace.permissions?.changeState && <button disabled={busy || saving || dirty} onClick={() => setChangingState(true)}><Icon name="archive" />{workspace.state === "archived" ? t("Mở lại Workspace") : t("Lưu trữ Workspace")}</button>}
            </div>
          </section>
          {workspace.state === "archived" && <InlineMessage tone="info">{t("Workspace đang lưu trữ. Dự án và Task bên trong chỉ đọc; mở lại Workspace không thay đổi trạng thái riêng của từng Dự án.")}</InlineMessage>}
          <div className="tabs workspace-tabs" aria-label={t("Nội dung Workspace")}>
            <button
              aria-pressed={tab === "projects"}
              disabled={saving}
              onClick={() => changeTab("projects")}
            >
              {t("Dự án")}
            </button>
            <button
              aria-pressed={tab === "members"}
              disabled={saving}
              onClick={() => changeTab("members")}
            >
              {t("Thành viên")}
            </button>
            {canManage && !workspace.organizationId && (
              <button
                aria-pressed={tab === "invitations"}
                disabled={saving}
                onClick={() => changeTab("invitations")}
              >
                {t("Lời mời")}
              </button>
            )}
            {canManage && (
              <button
                disabled={saving}
                aria-pressed={tab === "settings"}
                onClick={() => changeTab("settings")}
              >
                {t("Cài đặt nhóm")}
              </button>
            )}
            {workspace.permissions?.emailPreferences && <button
              disabled={saving}
              aria-pressed={tab === "email"}
              onClick={() => changeTab("email")}
            >
              {t("Email của tôi trong nhóm")}
            </button>}
          </div>
        </>
      )}
      {["members", "invitations"].includes(tab) && workspace && (
        <Team
          key={id + tab}
          api={api}
          id={id}
          invitations={tab === "invitations"}
          onContext={setWorkspace}
          onUnavailable={error => { setWorkspace(null); setError(messageFor(error)); }}
        />
      )}
      {["settings", "email"].includes(tab) && workspace && (
        <WorkspaceSettings
          key={id + tab}
          api={api}
          id={id}
          emailOnly={tab === "email"}
          onContext={setWorkspace}
          onDirty={setDirty}
          onSaving={setSaving}
        />
      )}
      {tab === "projects" && (
        <>
          <div className="workspace-collection-heading"><h2>{t("Dự án trong Workspace")}</h2><span className="muted">{data.total !== undefined ? t("{count} kết quả", { count: data.total }) : ""}</span></div>
          <FilterPanel locale={locale} compact advancedLabel={t("Thời gian")}>
            <label>
              {t("Tìm theo tên hoặc mô tả Dự án")}
              <input
                type="search"
                placeholder={t("Nhập để tìm kiếm…")}
                maxLength={200}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <label>
              {t("Trạng thái")}
              <select aria-label={t("Trạng thái Dự án")} value={state} onChange={(e) => setState(e.target.value)}>
                <option value="active">{t("Đang hoạt động")}</option>
                <option value="archived">{t("Đã lưu trữ")}</option>
                <option value="all">{t("Tất cả")}</option>
              </select>
            </label>
            <label>
              {t("Từ ngày tạo")}
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              {t("Đến ngày tạo")}
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              onClick={() => {
                setQ("");
                setFrom("");
                setTo("");
                setState("active");
              }}
            >
              {t("Xóa bộ lọc")}
            </button>
          </FilterPanel>
          <p className="muted">
            {t("Ngày tạo theo giờ Việt Nam · Tiến độ tính trên toàn Dự án, không gồm Task trong thùng rác")}
          </p>
          {invalid && (
            <InlineMessage>
              {t("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")}
            </InlineMessage>
          )}
        </>
      )}
      {busy && tab === "projects" && (
        <LoadingState>
          {t("Đang tải Dự án…")}
        </LoadingState>
      )}
      {tab === "projects" && (
        <>
          <div className="cards project-cards" aria-busy={busy}>
            {data.items.map((item, i) =>
              tab === "projects" ? (
                <article
                  className={
                    "card project-card" +
                    (item.readOnly ? " archived-card" : "")
                  }
                  key={item.id}
                >
                  <StudioCover
                    id={item.id}
                    project
                    archived={item.readOnly}
                  >
                    <span
                      className={
                        "badge " +
                        (item.readOnly
                          ? "state-archived"
                          : "state-active")
                      }
                    >
                      {item.readOnly
                        ? (item.state === "archived" ? t("Dự án lưu trữ · Chỉ đọc") : t("Workspace lưu trữ · Chỉ đọc"))
                        : t("Đang hoạt động")}
                    </span>
                  </StudioCover>
                  <div className="project-card-body">
                    <span className="project-type-icon">
                      <Icon name={item.icon ?? "folder"} />
                    </span>
                    <h2>
                      <a className="surface-link" href={`#project/${item.id}`}>
                        {item.name}
                      </a>
                    </h2>
                    <p>
                      {item.description?.plainText ||
                        t("Không gian để biến ý tưởng thành công việc.")}
                    </p>
                    {item.taskSummary && <div className="project-progress"><div><span>{t("{done}/{total} Task hoàn thành", { done: item.taskSummary.done, total: item.taskSummary.total })}</span><strong>{item.taskSummary.progressPercent}%</strong></div><progress aria-label={t("Tiến độ {name}", { name: item.name })} value={item.taskSummary.progressPercent} max="100" /></div>}
                    <p className="muted">
                      {t("Tạo")}{" "}
                      {new Date(item.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </p>
                    <div className="project-card-actions"><span className="card-link pill-link" aria-hidden="true">{item.readOnly ? t("Xem Dự án") : t("Vào Bảng Kanban")} <Icon name="chevron-right" /></span>
                    {!item.readOnly && item.permissions?.manageProject && <button aria-label={t("Sửa tên và biểu tượng {name}", { name: item.name })} onClick={() => setEditing(item)}>{t("Chỉnh sửa")}</button>}</div>
                  </div>
                </article>
              ) : (
                <article className="card" key={item.userId}>
                  <span className="avatar">
                    {item.displayName?.slice(0, 1)}
                  </span>
                  <h2>{item.displayName}</h2>
                  <span className="badge">
                    {item.role === "owner" ? t("Chủ sở hữu") : t("Thành viên")}
                  </span>
                  <p className="muted">
                    Tham gia{" "}
                    {new Date(item.joinedAt).toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </p>
                </article>
              ),
            )}
          </div>
          {!busy && !error && !invalid && !data.items.length && (
            <EmptyState>
              <h2>
                {tab === "projects"
                  ? t("Không có Dự án phù hợp")
                  : "Chưa có thành viên để hiển thị"}
              </h2>
              <p>
                {tab === "projects"
                  ? (canCreate ? t("Tạo Dự án đầu tiên hoặc thay đổi bộ lọc để tìm công việc của nhóm.") : t("Thay đổi bộ lọc hoặc liên hệ người quản lý để tạo Dự án."))
                  : "Danh sách chỉ gồm thành viên đang trong Workspace."}
              </p>
            </EmptyState>
          )}
          {data.nextCursor && (
            <button
              disabled={busy || Boolean(invalid && tab === "projects")}
              onClick={() => load(data.nextCursor)}
            >
              {t("Tải thêm")}
            </button>
          )}
        </>
      )}
      {changingState && workspace && <WorkspaceStateDialog api={api} workspace={workspace} onSaved={value => { setWorkspace(value); setRevision(v => v + 1); }} onClose={uncertain => { setChangingState(false); if (uncertain) setRevision(v => v + 1); }} />}
      {editing && <NameDialog locale={locale} title={t("Chỉnh sửa Dự án")} initial={editing.name} initialIcon={editing.icon ?? "folder"} withIcon label={t("Tên Dự án")} submitLabel={t("Lưu")} onClose={uncertain => { setEditing(null); if (uncertain) setRevision(v => v + 1); }} onSave={async (name, icon) => { await api.request(`/projects/${editing.id}`, { method: "PATCH", body: { expectedVersion: editing.version, name, icon } }); setRevision(v => v + 1); notify(t("Đã cập nhật Dự án.")); }} />}
      {creating && canCreate && (
        <NameDialog
          locale={locale}
          label={t("Tên Dự án")}
          title={t("Tạo Dự án")}
          withIcon
          submitLabel={t("Tạo Dự án")}
          onClose={(uncertain) => {
            setCreating(false);
            if (uncertain) setRevision((v) => v + 1);
          }}
          onSave={async (name, icon) => {
            await api.request(`/workspaces/${id}/projects`, {
              method: "POST",
              body: { name, icon },
            });
            setState("active");
            setQ("");
            setFrom("");
            setTo("");
            setRevision((v) => v + 1);
            notify(t("Đã tạo Dự án."));
          }}
        />
      )}
    </main>
  );
}
