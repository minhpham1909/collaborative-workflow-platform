import FilterPanel from "../../components/FilterPanel.jsx";
import { useEffect, useRef, useState } from "react";
import { statuses, deadline } from "../../lib/content.js";
import { messageFor } from "../../lib/messages.js";
import TaskForm from "./TaskForm.jsx";
export default function TaskList({ api, project, workspaceId, mine = false }) {
  const [workspaceFilter, setWorkspaceFilter] = useState(""),
    [workspaces, setWorkspaces] = useState({ items: [] });
  useEffect(() => {
    if (!mine) return;
    let live = true;
    api
      .request("/workspaces?limit=20")
      .then((v) => {
        if (live) setWorkspaces(v);
      })
      .catch((e) => {
        if (live) setError(messageFor(e));
      });
    return () => {
      live = false;
    };
  }, [mine]);
  async function moreWorkspaces() {
    try {
      const v = await api.request(
        "/workspaces?limit=20&cursor=" +
          encodeURIComponent(workspaces.nextCursor),
      );
      setWorkspaces((old) => ({ ...v, items: [...old.items, ...v.items] }));
    } catch (e) {
      setError(messageFor(e));
    }
  }
  const [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [timeField, setTime] = useState("createdAt"),
    [overdue, setOverdue] = useState(false),
    [status, setStatus] = useState(mine ? "open" : "all"),
    [state, setState] = useState("active"),
    [data, setData] = useState(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [creating, setCreating] = useState(false);
  const generation = useRef(0),
    invalid = from && to && from > to;
  const query = new URLSearchParams({
    limit: "12",
    status,
    timeField,
    ...(mine
      ? { state, ...(workspaceFilter ? { workspaceId: workspaceFilter } : {}) }
      : {}),
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(overdue ? { overdue: "true" } : {}),
  }).toString();
  async function load(token = generation.current) {
    setBusy(true);
    setError("");
    try {
      const result = await api.request(
        mine ? "/my-tasks?" + query : `/projects/${project.id}/board?` + query,
      );
      if (token === generation.current) setData(result);
    } catch (e) {
      if (token === generation.current) {
        setData(null);
        setError(messageFor(e));
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    const token = ++generation.current;
    setData(null);
    if (invalid) {
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(() => load(token), 300);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [query, project?.id, revision]);
  async function more(column) {
    const token = generation.current;
    setBusy(true);
    try {
      const page = mine ? data : data.columns[column];
      const qs = new URLSearchParams(query);
      qs.set("cursor", page.nextCursor);
      if (!mine) qs.set("status", column);
      const result = await api.request(
        mine ? "/my-tasks?" + qs : `/projects/${project.id}/tasks?` + qs,
      );
      if (token === generation.current)
        setData((old) => {
          const merged = {
            ...result,
            items: [...page.items, ...result.items].filter(
              (v, i, a) => a.findIndex((x) => x.id === v.id) === i,
            ),
          };
          return mine
            ? merged
            : { ...old, columns: { ...old.columns, [column]: merged } };
        });
    } catch (e) {
      if (token === generation.current) {
        setData(null);
        setError(messageFor(e));
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  function card(t) {
    return (
      <article className={"task-card" + (mine ? " task-row" : "")} key={t.id}>
        <div className="task-summary">
          <h3>
            <a href={`#task/${t.id}`}>{t.title}</a>
          </h3>
          {mine ? (
            <p>
              {t.workspaceName} / {t.projectName}{" "}
              {t.projectState === "archived" && "· Đã lưu trữ"}
            </p>
          ) : (
            <p>
              {t.assignee?.displayName ?? "Chưa phân công"}
              {t.assigneeLeft && " · Đã rời"}
            </p>
          )}
        </div>
        <div className="task-row-meta">
          <p>
            <span className={"pill status-" + t.status}>
              {statuses[t.status]}
            </span>{" "}
            {deadline(t.dueAt)}
          </p>
          {t.overdue && <strong className="overdue">Quá hạn</strong>}
        </div>
      </article>
    );
  }
  return (
    <section className="task-area">
      <div className="section-title">
        <div>
          <small className="eyebrow">
            {mine
              ? "TẬP TRUNG VÀO ĐIỀU QUAN TRỌNG"
              : "CÙNG NHÓM TIẾN VỀ PHÍA TRƯỚC"}
          </small>
          <h2>{mine ? "Công việc của tôi" : "Bảng công việc"}</h2>
          <p className="section-description">
            {mine
              ? "Công việc được giao cho bạn, trong một góc nhìn rõ ràng."
              : "Theo dõi tiến độ và tìm nhanh công việc trong dự án."}
          </p>
        </div>
        <div className="buttons">
          <button disabled={busy} onClick={() => setRevision((v) => v + 1)}>
            Làm mới công việc
          </button>
          {!mine && project.state === "active" && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => setCreating(true)}
            >
              + Tạo Task
            </button>
          )}
        </div>
      </div>
      {creating && (
        <TaskForm
          api={api}
          projectId={project.id}
          workspaceId={workspaceId}
          onCancel={(uncertain) => {
            setCreating(false);
            if (uncertain) setRevision((v) => v + 1);
          }}
          onDone={() => {
            setCreating(false);
            setRevision((v) => v + 1);
          }}
        />
      )}
      <FilterPanel>
        <label>
          Tìm Task
          <input
            type="search"
            placeholder="Nhập để tìm kiếm…"
            maxLength={200}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label>
          Trạng thái Task
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries({
              all: "Tất cả",
              open: "Chưa hoàn thành",
              ...statuses,
            }).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {mine && (
          <label>
            Workspace
            <select
              aria-label="Workspace"
              value={workspaceFilter}
              onChange={(e) => setWorkspaceFilter(e.target.value)}
            >
              <option value="">Tất cả Workspace</option>
              {workspaces.items.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {workspaces.nextCursor && (
              <button onClick={moreWorkspaces}>Tải thêm Workspace</button>
            )}
          </label>
        )}
        {mine && (
          <label>
            Dự án
            <select value={state} onChange={(e) => setState(e.target.value)}>
              <option value="active">Đang hoạt động</option>
              <option value="archived">Đã lưu trữ</option>
              <option value="all">Tất cả</option>
            </select>
          </label>
        )}
        <label>
          Thời gian
          <select value={timeField} onChange={(e) => setTime(e.target.value)}>
            <option value="createdAt">Ngày tạo</option>
            <option value="dueAt">Deadline</option>
          </select>
        </label>
        <label>
          Từ ngày
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => setOverdue(e.target.checked)}
          />
          Quá hạn
        </label>
        <button
          onClick={() => {
            setQ("");
            setFrom("");
            setTo("");
            setOverdue(false);
            setTime("createdAt");
            setStatus(mine ? "open" : "all");
            setState("active");
            setWorkspaceFilter("");
          }}
        >
          Xóa bộ lọc Task
        </button>
      </FilterPanel>
      <p className="muted">
        Mới tạo trước · Giờ Việt Nam ·{" "}
        {mine
          ? "Chỉ Task được giao cho bạn"
          : "Sắp xếp theo ngày tạo trong mỗi cột"}
      </p>
      {invalid && (
        <p role="alert" className="error">
          Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {busy && <p role="status">Đang tải công việc…</p>}
      {data &&
        (mine ? (
          <>
            <p>{data.total} công việc phù hợp</p>
            <div className="mine-list">{data.items.map(card)}</div>
            {!data.items.length && <p>Không có công việc phù hợp bộ lọc.</p>}
            {data.nextCursor && (
              <button disabled={busy} onClick={() => more()}>
                Tải thêm công việc
              </button>
            )}
          </>
        ) : (
          <div className="board">
            {Object.entries(statuses).map(([column, label]) => (
              <section className={"board-column " + column} key={column}>
                <h3>
                  {label} <span>{data.columns[column].total}</span>
                </h3>
                {data.columns[column].items.map(card)}
                {!data.columns[column].items.length && (
                  <p className="muted">Không có Task phù hợp.</p>
                )}
                {data.columns[column].nextCursor && (
                  <button disabled={busy} onClick={() => more(column)}>
                    Tải thêm {label}
                  </button>
                )}
              </section>
            ))}
          </div>
        ))}
    </section>
  );
}
