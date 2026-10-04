import FilterPanel from "../../components/FilterPanel.jsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { messageFor } from "../../lib/messages.js";
function plain(node) {
  if (!node) return "";
  if (typeof node.plainText === "string") return node.plainText;
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plain).join(" ");
}
export default function Home({ api, user }) {
  const [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [data, setData] = useState({ items: [], nextCursor: null }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [saving, setSaving] = useState(false),
    [createError, setCreateError] = useState("");
  const generation = useRef(0),
    mutation = useRef(false);
  const invalid = from && to && from > to;
  const query = new URLSearchParams({
    limit: "12",
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();
  async function load(cursor = null, token = generation.current) {
    setBusy(true);
    setError("");
    try {
      const result = await api.request(
        "/workspaces?" +
          query +
          (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      if (token === generation.current)
        setData((old) => ({
          ...result,
          items: cursor ? [...old.items, ...result.items] : result.items,
        }));
    } catch (e) {
      if (token === generation.current) {
        setData({ items: [], nextCursor: null });
        setError(messageFor(e));
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    const token = ++generation.current;
    if (invalid) {
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(() => load(null, token), 250);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [query, refresh, invalid]);
  const closeDialog = useRef(() => {});
  closeDialog.current = () => {
    if (!saving && (!name || confirm("Bỏ tên Workspace chưa lưu?")))
      setCreating(false);
  };
  useEffect(() => {
    if (!creating) return;
    const previous = document.activeElement;
    document.querySelector(".shell").inert = true;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog.current();
      }
      if (e.key === "Tab") {
        const nodes = [
          ...document.querySelectorAll(
            ".dialog input:not(:disabled),.dialog button:not(:disabled)",
          ),
        ];
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.querySelector(".shell")?.removeAttribute("inert");
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [creating]);
  async function create(e) {
    e.preventDefault();
    if (mutation.current) return;
    if (!name.trim() || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(name)) {
      setCreateError("Tên Workspace chưa hợp lệ.");
      return;
    }
    mutation.current = true;
    setSaving(true);
    setCreateError("");
    try {
      await api.request("/workspaces", { method: "POST", body: { name } });
      setCreating(false);
      setName("");
      setRefresh((v) => v + 1);
    } catch (e) {
      setCreateError(
        e.status
          ? messageFor(e)
          : "Chưa rõ yêu cầu tạo đã hoàn tất chưa. Đóng form và tải lại danh sách trước khi tạo lại.",
      );
    } finally {
      setSaving(false);
      mutation.current = false;
    }
  }
  return (
    <main>
      <section className="hero illustrated-hero">
        <div>
          <small>KHÔNG GIAN LÀM VIỆC CỦA BẠN</small>
          <h1>Chào {user.displayName}, hôm nay mình cùng làm gì? ✨</h1>
          <p>Chọn một Workspace để bắt đầu.</p>
        </div>
        <img
          className="hero-art"
          src="/illustrations/creative-workspace.svg"
          alt=""
        />
        <button className="primary" onClick={() => setCreating(true)}>
          + Tạo Workspace
        </button>
      </section>
      <FilterPanel>
        <label>
          Tìm theo tên hoặc mô tả Workspace
          <input
            type="search"
            placeholder="Nhập để tìm kiếm…"
            maxLength={200}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
          }}
        >
          Xóa bộ lọc
        </button>
        <button disabled={busy} onClick={() => setRefresh((v) => v + 1)}>
          Làm mới
        </button>
      </FilterPanel>
      {invalid && (
        <p className="error" role="alert">
          Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
        </p>
      )}
      <p className="muted">Mới tạo trước · Ngày theo giờ Việt Nam</p>
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button onClick={() => setRefresh((v) => v + 1)}>Thử lại</button>
        </div>
      )}
      {busy && <p role="status">Đang tải Workspace…</p>}
      <div className="cards" aria-busy={busy}>
        {data.items.map((w, i) => (
          <article className="card" key={w.id}>
            <span className={"symbol tone-" + (i % 3)}>
              {["✦", "◇", "↗"][i % 3]}
            </span>
            <span className="badge">
              {w.role === "owner" ? "Chủ sở hữu" : "Thành viên"}
            </span>
            <h2>
              <a href={`#workspace/${w.id}`}>{w.name}</a>
            </h2>
            <p>{plain(w.description) || "Không gian để cùng nhau làm việc."}</p>
            <p className="muted">
              Tạo{" "}
              {new Date(w.createdAt).toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
          </article>
        ))}
      </div>
      {!busy && !error && !data.items.length && (
        <section className="empty">
          <h2>
            {q || from || to
              ? "Không có Workspace phù hợp"
              : "Bạn chưa có Workspace"}
          </h2>
          <p>
            {q || from || to
              ? "Thử thay đổi từ khóa hoặc bộ lọc."
              : "Tạo Workspace đầu tiên để bắt đầu cùng đội ngũ."}
          </p>
        </section>
      )}
      {data.nextCursor && (
        <button
          disabled={busy || invalid}
          onClick={() => load(data.nextCursor)}
        >
          Tải thêm
        </button>
      )}
      {creating &&
        createPortal(
          <div className="overlay">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-title"
              className="dialog"
            >
              <h2 id="create-title">Tạo Workspace</h2>
              <form onSubmit={create}>
                <label>
                  Tên Workspace
                  <input
                    autoFocus
                    maxLength={200}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                  />
                </label>
                {createError && (
                  <p className="error" role="alert">
                    {createError}
                  </p>
                )}
                <div className="buttons">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (!name || confirm("Bỏ tên Workspace chưa lưu?"))
                        setCreating(false);
                    }}
                  >
                    Hủy
                  </button>
                  <button className="primary" disabled={saving}>
                    {saving ? "Đang tạo…" : "Tạo Workspace"}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )}
    </main>
  );
}
