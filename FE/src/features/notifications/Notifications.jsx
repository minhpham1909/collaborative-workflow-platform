import { confirmDialog } from "../../components/NotificationProvider.jsx";
import FilterPanel from "../../components/FilterPanel.jsx";
import { useEffect, useRef, useState } from "react";
import { messageFor } from "../../lib/messages.js";
const changed = () => window.dispatchEvent(new Event("workflow-inbox-changed"));
function Content({ note }) {
  if (!note.available)
    return (
      <>
        <h2>Nội dung không còn khả dụng</h2>
        <p>Bạn vẫn có thể đánh dấu thông báo này đã đọc.</p>
      </>
    );
  const p = note.payload;
  return note.category === "invitation" ? (
    <>
      <h2>Lời mời tham gia {p.workspaceName}</h2>
      <p>{p.inviterDisplayName} mời bạn vào Workspace.</p>
      <p>
        Hết hạn{" "}
        {new Date(p.expiresAt).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        })}
      </p>
    </>
  ) : (
    <>
      <h2>{p.taskTitle}</h2>
      <p>
        {p.actorDisplayName} · {p.workspaceName}
      </p>
      <p>
        {note.changes
          .map(
            (v) =>
              ({
                assignment: "Phân công",
                comment: "Bình luận mới",
                content: "Nội dung/deadline",
                status: "Trạng thái",
              })[v] ?? v,
          )
          .join(" · ")}
      </p>
    </>
  );
}
export function InboxBadge({ api, userId }) {
  const [count, setCount] = useState(null),
    [stale, setStale] = useState(false);
  useEffect(() => {
    let live = true,
      sequence = 0;
    async function load() {
      const token = ++sequence;
      try {
        const v = await api.request("/notifications?limit=1");
        if (live && token === sequence) {
          setCount(v.unreadCount);
          setStale(false);
        }
      } catch {
        if (live && token === sequence) setStale(true);
      }
    }
    load();
    window.addEventListener("focus", load);
    window.addEventListener("workflow-inbox-changed", load);
    return () => {
      live = false;
      window.removeEventListener("focus", load);
      window.removeEventListener("workflow-inbox-changed", load);
    };
  }, [api, userId]);
  return (
    <span
      aria-label={
        count === null
          ? "Chưa tải số thông báo chưa đọc"
          : `${count} thông báo chưa đọc${stale ? ", cần tải lại" : ""}`
      }
      className="inbox-badge"
    >
      {count === null ? "…" : count > 99 ? "99+" : count}
      {stale ? " ?" : ""}
    </span>
  );
}
export default function Notifications({ api, id, user }) {
  const [read, setRead] = useState("all"),
    [category, setCategory] = useState("all"),
    [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [data, setData] = useState(null),
    [loaded, setLoaded] = useState(""),
    [busy, setBusy] = useState(true),
    [mutating, setMutating] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const generation = useRef(0),
    pending = useRef(false),
    invalid = from && to && from > to;
  const query = new URLSearchParams({
    limit: "12",
    read,
    category,
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();
  async function load(cursor = null, token = generation.current) {
    setBusy(true);
    setError("");
    try {
      const result = await api.request(
        id
          ? `/notifications/${id}`
          : "/notifications?" +
              query +
              (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      if (token === generation.current) {
        setLoaded(query);
        setData((old) =>
          cursor
            ? {
                ...result,
                items: [...(old?.items ?? []), ...result.items].filter(
                  (v, i, a) => a.findIndex((x) => x.id === v.id) === i,
                ),
              }
            : result,
        );
      }
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
    setLoaded("");
    if (invalid && !id) {
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(() => load(null, token), id ? 0 : 300);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [id, query, revision]);
  async function mutate(path, body, kind) {
    if (pending.current) return;
    if (
      kind === "all" &&
      !(await confirmDialog(
        "Đánh dấu các thông báo chưa đọc theo loại, từ khóa và khoảng ngày hiện tại? Thông báo mới hơn lần tải này vẫn được giữ chưa đọc.",
      ))
    )
      return;
    pending.current = true;
    setMutating(true);
    setError("");
    setNotice("");
    try {
      const result = await api.request(path, { method: "POST", body });
      setNotice(
        kind === "accept"
          ? "Đã tham gia Workspace. Mở Trang chủ để chọn nhóm."
          : kind === "all"
            ? `Đã đánh dấu ${result.markedCount} thông báo đã đọc.`
            : "Đã đánh dấu đã đọc.",
      );
      changed();
      setRevision((v) => v + 1);
    } catch (e) {
      setError(
        e.status
          ? messageFor(e)
          : "Chưa xác nhận kết quả. Tải lại trước khi thử tiếp.",
      );
      if (e.status === 404) setData(null);
    } finally {
      pending.current = false;
      setMutating(false);
    }
  }
  function row(note) {
    return (
      <article
        className={"notification-row" + (!note.readAt ? " unread" : "")}
        key={note.id}
      >
        <p className="muted">
          {note.readAt ? "Đã đọc" : "● Chưa đọc"} ·{" "}
          {new Date(note.createdAt).toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </p>
        <Content note={note} />
        <div className="buttons">
          {!id && <a href={`#notification/${note.id}`}>Xem chi tiết</a>}
          {!note.readAt && (
            <button
              disabled={mutating || busy}
              onClick={() =>
                mutate(`/notifications/${note.id}/read`, {}, "one")
              }
            >
              Đánh dấu đã đọc
            </button>
          )}
          {id && note.available && note.target?.type === "task" && (
            <a href={`#task/${note.target.taskId}`}>Mở Task →</a>
          )}
          {id &&
            note.available &&
            note.target?.type === "invitation" &&
            (user.emailVerified ? (
              <button
                className="primary"
                disabled={mutating || busy}
                onClick={() =>
                  mutate(
                    `/invitations/${note.target.invitationId}/accept`,
                    {},
                    "accept",
                  )
                }
              >
                Tham gia Workspace
              </button>
            ) : (
              <p className="archive-banner">
                Xác minh email trước khi tham gia Workspace.
              </p>
            ))}
        </div>
      </article>
    );
  }
  return (
    <main>
      {id && (
        <p className="breadcrumbs">
          <a href="#notifications">Thông báo</a> / Chi tiết
        </p>
      )}
      <section className="hero">
        <div>
          <small>NHỮNG CẬP NHẬT DÀNH CHO BẠN</small>
          <h1>{id ? "Chi tiết thông báo" : "Thông báo"}</h1>
          <p>Những thay đổi công việc và lời mời liên quan đến bạn.</p>
        </div>
        <div className="buttons">
          <button
            disabled={busy || mutating}
            onClick={async () => {
              setNotice("");
              setRevision((v) => v + 1);
              changed();
            }}
          >
            Tải lại thông báo
          </button>
          {!id && (
            <button
              disabled={
                busy ||
                mutating ||
                loaded !== query ||
                !data?.cutoff ||
                !data?.unreadCount
              }
              onClick={() =>
                mutate(
                  "/notifications/read-all",
                  { cutoff: data.cutoff },
                  "all",
                )
              }
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </section>
      {!id && (
        <>
          <FilterPanel compact>
            <label>
              Trạng thái đọc
              <select
                aria-label="Trạng thái đọc"
                value={read}
                onChange={(e) => setRead(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="unread">Chưa đọc</option>
                <option value="read">Đã đọc</option>
              </select>
            </label>
            <label>
              Loại thông báo
              <select
                aria-label="Loại thông báo"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">Tất cả loại</option>
                <option value="work">Công việc</option>
                <option value="invitation">Lời mời</option>
              </select>
            </label>
            <label>
              Tìm thông báo
              <input
                type="search"
                placeholder="Nhập để tìm kiếm…"
                maxLength={200}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <label>
              Từ ngày thông báo
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Đến ngày thông báo
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              onClick={async () => {
                setRead("all");
                setCategory("all");
                setQ("");
                setFrom("");
                setTo("");
              }}
            >
              Xóa bộ lọc thông báo
            </button>
          </FilterPanel>
          {data && (
            <p className="muted">
              {data.total} kết quả · {data.unreadCount} chưa đọc theo loại/tìm
              kiếm/khoảng ngày, không theo trạng thái đọc · Mới tạo trước
            </p>
          )}
        </>
      )}
      {invalid && !id && (
        <p className="error" role="alert">
          Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {busy && <p role="status">Đang tải thông báo…</p>}
      {data &&
        (id ? (
          row(data.notification)
        ) : (
          <>
            {data.items.map(row)}
            {!data.items.length && (
              <section className="empty">
                <h2>Không có thông báo phù hợp</h2>
              </section>
            )}
            {data.nextCursor && (
              <button
                disabled={busy || mutating}
                onClick={() => load(data.nextCursor)}
              >
                Tải thêm thông báo
              </button>
            )}
          </>
        ))}
    </main>
  );
}
