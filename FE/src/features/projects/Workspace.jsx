import FilterPanel from "../../components/FilterPanel.jsx";
import { useEffect, useRef, useState } from "react";
import { messageFor } from "../../lib/messages.js";
import NameDialog from "../../components/NameDialog.jsx";
import Team from "./Team.jsx";
import WorkspaceSettings from "./WorkspaceSettings.jsx";
import RichEditor from "../../components/RichEditor.jsx";

export default function Workspace({ api, id }) {
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
    [revision, setRevision] = useState(0),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false);
  function changeTab(value) {
    if (!saving && (!dirty || confirm("Bỏ thay đổi cài đặt chưa lưu?"))) {
      setDirty(false);
      setTab(value);
    }
  }
  useEffect(() => {
    if (!dirty && !saving) return;
    const unload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const click = (e) => {
      if (
        e.target.closest("a[href]") &&
        (saving || !confirm("Bỏ thay đổi cài đặt chưa lưu?"))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, saving]);
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
    <main>
      <p className="breadcrumbs">
        <a href="#home">Trang chủ</a> / Workspace
      </p>
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button onClick={() => setRevision((v) => v + 1)}>Tải lại</button>
        </div>
      )}
      {workspace && (
        <>
          <section className="hero">
            <div>
              <small>KHÔNG GIAN CỦA ĐỘI NGŨ</small>
              <h1>{workspace.name}</h1>
              <span className="badge">
                {workspace.role === "owner" ? "Chủ sở hữu" : "Thành viên"}
              </span>
              {workspace.description?.plainText && (
                <details className="description">
                  <summary>Mô tả Workspace</summary>
                  <RichEditor
                    readOnly
                    value={workspace.description}
                    label="Mô tả nhóm"
                    limit={20000}
                  />
                </details>
              )}
            </div>
            {workspace.role === "owner" && tab === "projects" && (
              <button className="primary" onClick={() => setCreating(true)}>
                + Tạo Dự án
              </button>
            )}
          </section>
          <div className="tabs" aria-label="Nội dung Workspace">
            <button
              aria-pressed={tab === "projects"}
              disabled={saving}
              onClick={() => changeTab("projects")}
            >
              Dự án
            </button>
            <button
              aria-pressed={tab === "members"}
              disabled={saving}
              onClick={() => changeTab("members")}
            >
              Thành viên
            </button>
            {workspace.role === "owner" && (
              <button
                aria-pressed={tab === "invitations"}
                disabled={saving}
                onClick={() => changeTab("invitations")}
              >
                Lời mời
              </button>
            )}
            {workspace.role === "owner" && (
              <button
                disabled={saving}
                aria-pressed={tab === "settings"}
                onClick={() => changeTab("settings")}
              >
                Cài đặt nhóm
              </button>
            )}
            <button
              disabled={saving}
              aria-pressed={tab === "email"}
              onClick={() => changeTab("email")}
            >
              Email của tôi trong nhóm
            </button>
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
          <FilterPanel>
            <label>
              Tìm theo tên hoặc mô tả Dự án
              <input
                type="search"
                placeholder="Nhập để tìm kiếm…"
                maxLength={200}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <label>
              Trạng thái
              <select value={state} onChange={(e) => setState(e.target.value)}>
                <option value="active">Đang hoạt động</option>
                <option value="archived">Đã lưu trữ</option>
                <option value="all">Tất cả</option>
              </select>
            </label>
            <label>
              Từ ngày tạo
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Đến ngày tạo
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
              Xóa bộ lọc
            </button>
          </FilterPanel>
          <p className="muted">
            Mới tạo trước · Ngày theo giờ Việt Nam
            {data.total !== undefined ? ` · ${data.total} Dự án phù hợp` : ""}
          </p>
          {invalid && (
            <p className="error" role="alert">
              Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
            </p>
          )}
        </>
      )}
      {busy && tab === "projects" && (
        <p role="status">
          Đang tải {tab === "projects" ? "Dự án" : "thành viên"}…
        </p>
      )}
      {tab === "projects" && (
        <>
          <div className="cards" aria-busy={busy}>
            {data.items.map((item, i) =>
              tab === "projects" ? (
                <article className="card" key={item.id}>
                  <span className={"symbol tone-" + (i % 3)}>
                    {item.state === "archived" ? "⌁" : "✦"}
                  </span>
                  <span className="badge">
                    {item.state === "archived"
                      ? "Đã lưu trữ · Chỉ đọc"
                      : "Đang hoạt động"}
                  </span>
                  <h2>
                    <a href={`#project/${item.id}`}>{item.name}</a>
                  </h2>
                  <p>
                    {item.description?.plainText ||
                      "Không gian để biến ý tưởng thành công việc."}
                  </p>
                  <p className="muted">
                    Tạo{" "}
                    {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </p>
                  <a className="card-link" href={`#project/${item.id}`}>
                    Xem Dự án →
                  </a>
                </article>
              ) : (
                <article className="card" key={item.userId}>
                  <span className="avatar">
                    {item.displayName?.slice(0, 1)}
                  </span>
                  <h2>{item.displayName}</h2>
                  <span className="badge">
                    {item.role === "owner" ? "Chủ sở hữu" : "Thành viên"}
                  </span>
                  <p className="muted">
                    Tham gia{" "}
                    {new Date(item.joinedAt).toLocaleDateString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </p>
                </article>
              ),
            )}
          </div>
          {!busy && !error && !invalid && !data.items.length && (
            <section className="empty">
              <h2>
                {tab === "projects"
                  ? "Không có Dự án phù hợp"
                  : "Chưa có thành viên để hiển thị"}
              </h2>
              <p>
                {tab === "projects"
                  ? "Tạo Dự án mới hoặc thay đổi bộ lọc."
                  : "Danh sách chỉ gồm thành viên đang trong Workspace."}
              </p>
            </section>
          )}
          {data.nextCursor && (
            <button
              disabled={busy || Boolean(invalid && tab === "projects")}
              onClick={() => load(data.nextCursor)}
            >
              Tải thêm
            </button>
          )}
        </>
      )}
      {creating && workspace?.role === "owner" && (
        <NameDialog
          title="Tạo Dự án"
          onClose={() => setCreating(false)}
          onSave={async (name) => {
            await api.request(`/workspaces/${id}/projects`, {
              method: "POST",
              body: { name },
            });
            setState("active");
            setQ("");
            setFrom("");
            setTo("");
            setRevision((v) => v + 1);
          }}
        />
      )}
    </main>
  );
}
