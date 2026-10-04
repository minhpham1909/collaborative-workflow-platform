import {
  EmptyState,
  InlineMessage,
  LoadingState,
} from "../../components/Feedback.jsx";
import FilterPanel from "../../components/FilterPanel.jsx";
import WorkspacePicker from "../../components/WorkspacePicker.jsx";
import { useEffect, useRef, useState } from "react";
import { statuses, deadline } from "../../lib/content.js";
import { messageFor } from "../../lib/messages.js";
import TaskForm from "./TaskForm.jsx";
import Avatar from "../../components/Avatar.jsx";
import Icon from "../../components/Icon.jsx";
export default function TaskList({
  api,
  project,
  workspaceId,
  mine = false,
  onComposing,
}) {
  const [workspaceFilter, setWorkspaceFilter] = useState(""),
    [filterReset, setFilterReset] = useState(0);
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
  useEffect(() => {
    onComposing?.(creating);
    return () => onComposing?.(false);
  }, [creating, onComposing]);
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
      <article
        className={
          "task-card" +
          (mine
            ? " task-row"
            : ` board-task status-${t.status}${t.overdue ? " is-overdue" : ""}`)
        }
        key={t.id}
      >
        {!mine && (
          <div className="board-task-top">
            <span className={"pill status-" + t.status}>
              {statuses[t.status]}
            </span>
            {t.overdue && <span className="overdue-chip">Quá hạn</span>}
          </div>
        )}
        <div className="task-summary">
          <h3>
            <a className="surface-link" href={`#task/${t.id}`}>
              {t.title}
            </a>
          </h3>
          {mine ? (
            <p>
              {t.workspaceName} / {t.projectName}{" "}
              {t.projectState === "archived" && "· Đã lưu trữ"}
            </p>
          ) : (
            <>
              {t.description?.plainText && (
                <p className="board-task-excerpt">{t.description.plainText}</p>
              )}
              <p className="board-assignee">
                {t.assignee ? (
                  <Avatar user={t.assignee} />
                ) : (
                  <Icon name="people" />
                )}
                <span>
                  {t.assignee?.displayName ?? "Chưa phân công"}
                  {t.assigneeLeft && (
                    <span className="left-member"> · Đã rời</span>
                  )}
                </span>
              </p>
            </>
          )}
        </div>
        <div className="task-row-meta">
          <p>
            {mine && (
              <span className={"pill status-" + t.status}>
                {statuses[t.status]}
              </span>
            )}{" "}
            {!mine && <Icon name="calendar" />}
            {deadline(t.dueAt)}
          </p>
          {mine && t.overdue && <strong className="overdue">Quá hạn</strong>}
        </div>
      </article>
    );
  }
  return (
    <section className={"task-area" + (mine ? "" : " studio-board-area")}>
      <div className="section-title">
        <div>
          {mine && (
            <small className="eyebrow">TẬP TRUNG VÀO ĐIỀU QUAN TRỌNG</small>
          )}
          {mine ? (
            <h1 className="task-list-title">Công việc của tôi</h1>
          ) : (
            <h2>Bảng công việc</h2>
          )}
          {mine && (
            <p className="section-description">
              Công việc được giao cho bạn, trong một góc nhìn rõ ràng.
            </p>
          )}
        </div>
        <div className="buttons">
          <button
            disabled={busy || creating}
            onClick={() => setRevision((v) => v + 1)}
          >
            Làm mới công việc
          </button>
          {!mine && project.state === "active" && (
            <button
              className="primary"
              disabled={busy || creating}
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
      <FilterPanel compact>
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
          <WorkspacePicker
            api={api}
            value={workspaceFilter}
            onChange={setWorkspaceFilter}
            resetKey={filterReset}
            filterActive={Boolean(workspaceFilter)}
          />
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
            setFilterReset((v) => v + 1);
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
        <InlineMessage>
          Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
        </InlineMessage>
      )}
      {error && <InlineMessage>{error}</InlineMessage>}
      {busy && <LoadingState>Đang tải công việc…</LoadingState>}
      {data &&
        (mine ? (
          <>
            <p>{data.total} công việc phù hợp</p>
            <div className="mine-list">{data.items.map(card)}</div>
            {!data.items.length && (
              <EmptyState>
                Không có công việc phù hợp bộ lọc. Thử đổi từ khóa hoặc xóa bộ
                lọc.
              </EmptyState>
            )}
            {data.nextCursor && (
              <button disabled={busy} onClick={() => more()}>
                Tải thêm công việc
              </button>
            )}
          </>
        ) : (
          <>
            <div className="board" aria-busy={busy}>
              {Object.entries(statuses).map(([column, label]) => (
                <section
                  className={"board-column " + column}
                  key={column}
                  tabIndex={0}
                  aria-label={`${label}: ${data.columns[column].total} Task`}
                >
                  <div className="board-column-heading">
                    <h3>
                      <span className="column-dot" aria-hidden="true" />
                      {label}{" "}
                      <span className="column-count">
                        {data.columns[column].total}
                      </span>
                    </h3>
                    <Icon
                      name={
                        column === "done"
                          ? "check"
                          : column === "in_progress"
                            ? "layers"
                            : "tasks"
                      }
                    />
                  </div>
                  {data.columns[column].items.map(card)}
                  {!data.columns[column].items.length && (
                    <EmptyState>Không có Task phù hợp.</EmptyState>
                  )}
                  {data.columns[column].nextCursor && (
                    <button disabled={busy} onClick={() => more(column)}>
                      Tải thêm {label}
                    </button>
                  )}
                </section>
              ))}
            </div>
            <BoardProgress columns={data.columns} />
          </>
        ))}
    </section>
  );
}
function BoardProgress({ columns }) {
  const total = Object.values(columns).reduce(
    (sum, column) => sum + column.total,
    0,
  );
  const done = columns.done.total;
  return (
    <section
      className="board-progress"
      aria-label="Tiến độ công việc phù hợp bộ lọc"
    >
      <span className="progress-icon">
        <Icon name="layers" />
      </span>
      <div>
        <strong>Tiến độ công việc</strong>
        <p>
          {done}/{total} Task phù hợp bộ lọc đã hoàn thành
        </p>
      </div>
      <progress
        max={total || 1}
        value={done}
        aria-label={`${done} trên ${total} Task đã hoàn thành`}
      />
      <span>{total ? Math.round((done / total) * 100) : 0}%</span>
    </section>
  );
}
