import FilterPanel from "../../components/FilterPanel.jsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Avatar from "../../components/Avatar.jsx";
import { messageFor } from "../../lib/messages.js";
import { useDraftGuard } from "../../lib/draft-navigation.js";
const date = (value) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const states = {
  active: "Còn hiệu lực",
  expired: "Hết hạn",
  accepted: "Đã nhận",
  revoked: "Đã thu hồi",
};
const delivery = {
  pending: "Chờ gửi",
  processing: "Đang gửi",
  sent: "Dịch vụ gửi đã nhận",
  failed: "Gửi thất bại",
  cancelled: "Đã hủy gửi",
};
export default function Team({ api, id, invitations, onContext }) {
  const [workspace, setWorkspace] = useState(null),
    [data, setData] = useState({ items: [] }),
    [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [type, setType] = useState("all"),
    [state, setState] = useState("all"),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [action, setAction] = useState(null),
    [revision, setRevision] = useState(0);
  const generation = useRef(0),
    invalid = from && to && from > to;
  const query = new URLSearchParams({
    limit: "12",
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(invitations ? { type, state } : {}),
  }).toString();
  async function load(cursor = null, token = generation.current) {
    setBusy(true);
    setError("");
    try {
      const context = (await api.request(`/workspaces/${id}`)).workspace;
      if (token !== generation.current) return;
      setWorkspace(context);
      onContext(context);
      if (invitations && context.role !== "owner") {
        setData({ items: [] });
        setAction(null);
        return;
      }
      const result = await api.request(
        `/workspaces/${id}/${invitations ? "invitations" : "members"}?${query}${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`,
      );
      if (token === generation.current)
        setData((old) => ({
          ...result,
          items: cursor ? [...old.items, ...result.items] : result.items,
        }));
    } catch (e) {
      if (token === generation.current) {
        setError(messageFor(e));
        setData({ items: [] });
        setWorkspace(null);
        setAction(null);
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    const token = ++generation.current;
    setData({ items: [] });
    setBusy(!invalid);
    if (invalid) return;
    const timer = setTimeout(() => load(null, token), 250);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [id, query, revision]);
  const owner = workspace?.role === "owner";
  return (
    <section>
      <div className="section-heading">
        <h2>{invitations ? "Lời mời tham gia" : "Thành viên trong nhóm"}</h2>
        <div className="buttons">
          <button disabled={busy} onClick={() => setRevision((v) => v + 1)}>
            Làm mới danh sách
          </button>
          {invitations && owner && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => setAction({ kind: "invite" })}
            >
              + Tạo lời mời
            </button>
          )}
        </div>
      </div>
      {invitations && workspace && !owner ? (
        <p>Chỉ chủ sở hữu được quản lý lời mời.</p>
      ) : (
        <>
          <FilterPanel
            compact
            sortLabel={invitations ? "Mới tạo trước" : "Mới tham gia trước"}
          >
            <label>
              {invitations ? "Tìm email người nhận" : "Tìm tên thành viên"}
              <input
                type="search"
                placeholder="Nhập để tìm kiếm…"
                maxLength={200}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {invitations && (
              <>
                <label>
                  Loại lời mời
                  <select
                    aria-label="Loại lời mời"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="all">Tất cả</option>
                    <option value="EMAIL">Email</option>
                    <option value="LINK">Liên kết</option>
                  </select>
                </label>
                <label>
                  Hiệu lực
                  <select
                    aria-label="Hiệu lực"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    <option value="all">Tất cả</option>
                    {Object.entries(states).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label>
              Từ ngày {invitations ? "tạo" : "gia nhập"}
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Đến ngày {invitations ? "tạo" : "gia nhập"}
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
                setType("all");
                setState("all");
              }}
            >
              Xóa bộ lọc
            </button>
          </FilterPanel>
          <p className="muted">
            Mới {invitations ? "tạo" : "gia nhập"} trước · Thời gian Việt Nam ·
            Tìm kiếm trên toàn danh sách có quyền xem
          </p>
          {invalid && (
            <p className="error" role="alert">
              Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {busy && <p role="status">Đang tải danh sách…</p>}
          <div className="cards" aria-busy={busy}>
            {data.items.map((item) => (
              <article className="card" key={item.id ?? item.userId}>
                {invitations ? (
                  <>
                    <span className="badge">
                      {item.type === "EMAIL" ? "Email" : "Liên kết"}
                    </span>
                    <h3>{item.email ?? "Liên kết tham gia"}</h3>
                    <p>{states[item.state]}</p>
                    <p className="muted">
                      Tạo {date(item.createdAt)}
                      <br />
                      Hết hạn {date(item.expiresAt)}
                    </p>
                    {item.emailDelivery && (
                      <p>Email: {delivery[item.emailDelivery]}</p>
                    )}
                    {owner && item.state === "active" && (
                      <div className="buttons">
                        <button
                          disabled={busy}
                          onClick={() => setAction({ kind: "revoke", item })}
                        >
                          Thu hồi
                        </button>
                        {item.emailDelivery === "failed" && (
                          <button
                            disabled={busy}
                            onClick={() => setAction({ kind: "retry", item })}
                          >
                            Thử gửi lại email
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Avatar user={item} />
                    <h3>{item.displayName}</h3>
                    <span className="badge">
                      {item.role === "owner" ? "Chủ sở hữu" : "Thành viên"}
                    </span>
                    <p className="muted">Tham gia {date(item.joinedAt)}</p>
                    {owner && item.role !== "owner" && (
                      <div className="buttons">
                        <button
                          disabled={busy}
                          onClick={() => setAction({ kind: "remove", item })}
                        >
                          Loại khỏi nhóm
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => setAction({ kind: "transfer", item })}
                        >
                          Chuyển quyền sở hữu
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
          {!busy && !error && !invalid && !data.items.length && (
            <p className="empty">
              Không có {invitations ? "lời mời" : "thành viên"} phù hợp.
            </p>
          )}
          {data.nextCursor && (
            <button disabled={busy} onClick={() => load(data.nextCursor)}>
              Tải thêm
            </button>
          )}
        </>
      )}
      {!invitations && workspace && (
        <section className="project-info">
          <h3>Tư cách thành viên của bạn</h3>
          {owner ? (
            <p>
              Để rời nhóm, hãy chuyển quyền sở hữu cho một thành viên hiện tại
              trước.
            </p>
          ) : (
            <>
              <p>
                Rời nhóm sẽ mất quyền truy cập Workspace và đưa tùy chọn email
                riêng về mặc định.
              </p>
              <button
                disabled={busy}
                onClick={() => setAction({ kind: "leave" })}
              >
                Rời Workspace
              </button>
            </>
          )}
        </section>
      )}
      {action && workspace && (
        <TeamAction
          api={api}
          workspace={workspace}
          action={action}
          onClose={() => {
            setAction(null);
            setRevision((v) => v + 1);
          }}
        />
      )}
    </section>
  );
}
function TeamAction({ api, workspace, action, onClose }) {
  const [type, setType] = useState("EMAIL"),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState(null),
    [blocked, setBlocked] = useState(false),
    [copied, setCopied] = useState("");
  useDraftGuard({
    dirty:
      action.kind === "invite" && !result && Boolean(email || type !== "EMAIL"),
    busy,
    message: "Bỏ lời mời đang soạn?",
  });
  const pending = useRef(false),
    panel = useRef(null);
  const titles = {
    invite: "Tạo lời mời",
    remove: "Loại thành viên",
    transfer: "Chuyển quyền sở hữu",
    leave: "Rời Workspace",
    revoke: "Thu hồi lời mời",
    retry: "Thử gửi lại email",
  };
  const explanation = {
    remove:
      "Người này sẽ mất quyền truy cập. Task chưa Done bị bỏ assignee, kể cả trong Project Archived; Task Done giữ người cũ. Task và bình luận không bị xóa.",
    transfer:
      "Người này sẽ trở thành Owner; bạn trở thành Member và mất quyền quản lý nhóm/lời mời. Bạn vẫn ở trong nhóm, lời mời còn hiệu lực được giữ.",
    leave:
      "Bạn sẽ mất quyền truy cập. Task chưa Done bị bỏ assignee; Task Done giữ người cũ. Tùy chọn email riêng được xóa.",
    revoke:
      "Ngăn gia nhập qua lời mời này về sau; không loại người đã tham gia và không rút email đã gửi.",
    retry: "Chỉ xếp hàng gửi lại email thất bại; thời hạn lời mời giữ nguyên.",
  };
  useEffect(() => {
    const previous = document.activeElement,
      shell = document.querySelector(".shell");
    shell.inert = true;
    const nodes = () => [
      ...panel.current.querySelectorAll(
        "input:not(:disabled),select:not(:disabled),button:not(:disabled),textarea:not(:disabled)",
      ),
    ];
    nodes()[0]?.focus();
    const key = (e) => {
      if (e.key === "Escape" && !pending.current) onClose();
      if (e.key === "Tab") {
        const list = nodes(),
          first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      shell.removeAttribute("inert");
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  async function submit(e) {
    e.preventDefault();
    if (pending.current || blocked || result) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const base = `/workspaces/${workspace.id}`,
      item = action.item;
    try {
      let path = base,
        method = "POST",
        body;
      if (action.kind === "invite") {
        path += "/invitations";
        body = { type, ...(type === "EMAIL" ? { email: email.trim() } : {}) };
      }
      if (action.kind === "remove") {
        path += `/members/${item.userId}/remove`;
        body = { expectedVersion: item.version };
      }
      if (action.kind === "transfer") {
        path += "/ownership";
        method = "PATCH";
        body = { expectedVersion: workspace.version, memberId: item.userId };
      }
      if (action.kind === "leave") {
        path += "/leave";
        body = { expectedVersion: workspace.membershipVersion };
      }
      if (["revoke", "retry"].includes(action.kind)) {
        path += `/invitations/${item.id}/${action.kind === "retry" ? "retry-email" : "revoke"}`;
        body = { expectedVersion: item.version };
      }
      const value = await api.request(path, { method, body });
      if (action.kind === "leave") {
        location.hash = "home";
        return;
      }
      if (action.kind === "invite") setResult(value);
      else {
        onClose();
      }
    } catch (e) {
      setError(
        e.status
          ? messageFor(e)
          : "Chưa xác nhận được kết quả. Đóng và làm mới danh sách trước khi thao tác lại.",
      );
      setBlocked(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return createPortal(
    <div className="overlay">
      <section
        ref={panel}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-title"
      >
        <h2 id="team-title">{titles[action.kind]}</h2>
        <p>
          {workspace.name}
          {action.item &&
            ` · ${action.item.displayName ?? action.item.email ?? "Liên kết tham gia"}`}
        </p>
        {result ? (
          <>
            <p role="status">
              {result.code === "ALREADY_MEMBER"
                ? "Người này đã ở trong nhóm."
                : result.url
                  ? "Đã tạo liên kết. Sao chép trước khi đóng; danh sách không lưu lại URL."
                  : "Đã tạo lời mời; email đang chờ gửi."}
            </p>
            {result.url && (
              <>
                <label>
                  Liên kết tham gia
                  <textarea
                    readOnly
                    value={result.url}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <p>
                  Hết hạn {date(result.invitation.expiresAt)}. Ai có link hợp lệ
                  và tài khoản đã xác minh đều có thể tham gia.
                </p>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(result.url);
                      setCopied("Đã sao chép.");
                    } catch {
                      setCopied("Chọn liên kết để sao chép thủ công.");
                    }
                  }}
                >
                  Sao chép liên kết
                </button>
                <p role="status">{copied}</p>
              </>
            )}
            <button
              onClick={() => {
                onClose();
              }}
            >
              Đóng kết quả
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            {action.kind === "invite" ? (
              <fieldset disabled={busy || blocked}>
                <label>
                  Cách mời
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="EMAIL">Qua email</option>
                    <option value="LINK">Qua liên kết</option>
                  </select>
                </label>
                {type === "EMAIL" && (
                  <label>
                    Email người nhận
                    <input
                      type="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                )}
                <p>
                  Lời mời có hạn 7 ngày. Chỉ tài khoản đã xác minh được gia
                  nhập.
                </p>
              </fieldset>
            ) : (
              <p>{explanation[action.kind]}</p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="buttons">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onClose();
                }}
              >
                Đóng
              </button>
              <button className="primary" disabled={busy || blocked}>
                {busy ? "Đang xử lý…" : "Xác nhận"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
}
