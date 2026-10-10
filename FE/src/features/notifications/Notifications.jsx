import {
  EmptyState,
  InlineMessage,
  LoadingState,
} from "../../components/Feedback.jsx";
import { confirmDialog } from "../../components/NotificationProvider.jsx";
import { useShellText } from '../../lib/useShellText.js';
import FilterPanel from "../../components/FilterPanel.jsx";
import { useEffect, useRef, useState } from "react";
import { messageFor } from "../../lib/messages.js";
import Icon from '../../components/Icon.jsx';
import { useDraftGuard } from '../../lib/draft-navigation.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import './notifications.css';
import { inboxFilters, inboxReturn } from './inbox-filters.js';
const categories = { work:'Công việc', invitation:'Lời mời Workspace', membership:'Tham gia Workspace', organization_invitation:'Lời mời tổ chức', project_invitation:'Lời mời Guest' };
const noteIcon = note => !note.available ? 'archive' : note.category==='work' ? note.changes.includes('comment')?'document':'tasks' : 'people';
const changed = () => window.dispatchEvent(new Event("workflow-inbox-changed"));
function Content({ note }) {
  if (!note.available)
    return (
      <>
        <h3>Nội dung không còn khả dụng</h3>
        <p>Bạn vẫn có thể đánh dấu thông báo này đã đọc.</p>
      </>
    );
  const p = note.payload;
  if (note.category === "project_invitation")
    return (
      <>
        <h3>Lời mời xem {p.projectName}</h3>
        <p>{p.inviterDisplayName} mời bạn xem và bình luận trong Project này.</p>
        <p>Workspace: {p.workspaceName}</p>
        <p>Hết hạn {new Date(p.expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
      </>
    );
  if (note.category === "organization_invitation")
    return (
      <>
        <h3>Lời mời tham gia {p.organizationName}</h3>
        <p>{p.inviterDisplayName} mời bạn vào tổ chức với vai trò Member.</p>
        {p.workspaceName && <p>Bạn cũng sẽ tham gia Workspace: {p.workspaceName}.</p>}
        <p>Hết hạn {new Date(p.expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
      </>
    );
  if (note.category === "membership")
    return (
      <>
        <h3>Bạn đã được thêm vào {p.workspaceName}</h3>
        <p>{p.actorDisplayName} đã thêm bạn vào Workspace.</p>
      </>
    );
  return note.category === "invitation" ? (
    <>
      <h3>Lời mời tham gia {p.workspaceName}</h3>
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
      <h3>{p.taskTitle}</h3>
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
  const { t } = useShellText();
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
          ? t('Chưa tải số thông báo chưa đọc')
          : t('{count} thông báo chưa đọc', { count }) + (stale ? t(', cần tải lại') : '')
      }
      className="inbox-badge"
    >
      {count === null ? "…" : count > 99 ? "99+" : count}
      {stale ? " ?" : ""}
    </span>
  );
}
export default function Notifications({ api, id, user }) {
  const [read, setRead] = useState(()=>inboxFilters().read),
    [category, setCategory] = useState(()=>inboxFilters().category),
    [q, setQ] = useState(()=>inboxFilters().q),
    [from, setFrom] = useState(()=>inboxFilters().from),
    [to, setTo] = useState(()=>inboxFilters().to),
    [data, setData] = useState(null),
    [loaded, setLoaded] = useState(""),
    [busy, setBusy] = useState(true),
    [mutating, setMutating] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0), [uncertain, setUncertain] = useState(false);
  const generation = useRef(0),
    pending = useRef(false),
    invalid = from && to && from > to;
  useDraftGuard({ dirty:false, busy:mutating, message:'Thông báo đang được xử lý.' });
  function filter(setter,value,current) {if(value===current)return;generation.current++;setData(null);setLoaded('');setError('');setter(value);}
  const query = new URLSearchParams({
    limit: "12",
    read,
    category,
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();
  useEffect(()=>{if(!id)history.replaceState(history.state,'','#notifications?'+query);},[id,query]);
  useEffect(()=>{if(id)return;const sync=()=>{if(location.hash.split('?')[0]!=='#notifications')return;const values=inboxFilters();setRead(values.read);setCategory(values.category);setQ(values.q);setFrom(values.from);setTo(values.to);};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[id]);
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
    setUncertain(false);
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
    if (pending.current || uncertain) return;
    pending.current = true;
    setMutating(true);
    setError("");
    setNotice("");
    try {
      if (kind === 'all' && !(await confirmDialog('Đánh dấu các thông báo chưa đọc theo loại, từ khóa và khoảng ngày hiện tại? Không phụ thuộc tab Đã đọc/Chưa đọc và bao gồm các trang chưa tải. Thông báo mới hơn lần tải này vẫn được giữ chưa đọc.', { title:'Đánh dấu đã đọc', confirmLabel:'Đánh dấu đã đọc' }))) return;
      const result = await api.request(path, { method: "POST", body });
      setNotice(
        kind === "acceptProject"
          ? "Đã được cấp quyền xem và bình luận Project."
          : kind === "acceptOrganization"
          ? "Đã tham gia tổ chức. Mở Trang chủ để chọn Workspace được cấp."
          : kind === "accept"
          ? "Đã tham gia Workspace. Mở Trang chủ để chọn nhóm."
          : kind === "all"
            ? `Đã đánh dấu ${result.markedCount} thông báo đã đọc.`
            : "Đã đánh dấu đã đọc.",
      );
      changed();
      setRevision((v) => v + 1);
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        isUncertainMutation(e) ? "Chưa xác nhận kết quả. Tải lại trước khi thử tiếp." : messageFor(e),
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
        className={"notification-row studio-note category-"+note.category + (!note.readAt ? " unread" : "")}
        key={note.id}
      >
        <span className="note-icon" aria-hidden="true"><Icon name={noteIcon(note)}/></span><div className="note-body">
        <div className="note-category">{categories[note.category] ?? 'Thông báo'}</div>
        <p className="muted">
          {note.readAt ? "Đã đọc" : "● Chưa đọc"} ·{" "}
          {new Date(note.createdAt).toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </p>
        <Content note={note} />
        <div className="buttons">
          {!id && <a href={`#notification/${note.id}?returnTo=${encodeURIComponent('#notifications?'+query)}`}>Xem chi tiết</a>}
          {!note.readAt && (
            <button
              disabled={mutating || busy || uncertain}
              onClick={() =>
                mutate(`/notifications/${note.id}/read`, {}, "one")
              }
            >
              Đánh dấu đã đọc
            </button>
          )}
          {note.available && note.target?.type === "task" && (
            <a href={`#task/${note.target.taskId}`}>Mở Task →</a>
          )}
          {note.available && note.target?.type === "workspace" && (
            <a href={`#workspace/${note.target.workspaceId}`}>Mở Workspace →</a>
          )}
          {id && note.available && note.target?.type === "organization_invitation" && (
            user.emailVerified ? (
              <button className="primary" disabled={mutating || busy || uncertain} onClick={() => mutate(
                `/organization-invitations/${note.target.invitationId}/accept`, {}, "acceptOrganization",
              )}>Tham gia tổ chức</button>
            ) : <p className="archive-banner">Xác minh email trước khi tham gia tổ chức.</p>
          )}
          {id && note.available && note.target?.type === "project_invitation" && (
            user.emailVerified ? (
              <button className="primary" disabled={mutating || busy || uncertain} onClick={() => mutate(
                `/project-invitations/${note.target.invitationId}/accept`, {}, "acceptProject",
              )}>Chấp nhận quyền Guest</button>
            ) : <p className="archive-banner">Xác minh email trước khi tham gia Project.</p>
          )}
          {id &&
            note.available &&
            note.target?.type === "invitation" &&
            (user.emailVerified ? (
              <button
                className="primary"
                disabled={mutating || busy || uncertain}
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
        </div></div>
      </article>
    );
  }
  return (
    <main className="studio-notifications">
      {id && (
        <p className="breadcrumbs">
          <a href={inboxReturn()}>Thông báo</a> / Chi tiết
        </p>
      )}
      <section className="hero notification-hero">
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
                uncertain ||
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
          <div className="notification-quick" aria-label="Lọc nhanh thông báo">{[['all','Tất cả thông báo'],['unread','Chưa đọc'],['read','Đã đọc']].map(([value,label])=><button key={value} disabled={mutating} aria-pressed={read===value} onClick={()=>filter(setRead,value,read)}>{label}</button>)}</div>
          <fieldset className="notification-filter-fields" disabled={mutating}><FilterPanel compact advancedLabel="Lọc nâng cao">
            <label>
              Trạng thái đọc
              <select
                aria-label="Trạng thái đọc"
                value={read}
                onChange={(e) => filter(setRead,e.target.value,read)}
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
                onChange={(e) => filter(setCategory,e.target.value,category)}
              >
                <option value="all">Tất cả loại</option>
                <option value="work">Công việc</option>
                <option value="invitation">Lời mời</option>
                <option value="membership">Tham gia Workspace</option>
                <option value="organization_invitation">Lời mời tổ chức</option>
                <option value="project_invitation">Lời mời Guest</option>
              </select>
            </label>
            <label>
              Tìm thông báo
              <input
                type="search"
                placeholder="Nhập để tìm kiếm…"
                maxLength={200}
                value={q}
                onChange={(e) => filter(setQ,e.target.value,q)}
              />
            </label>
            <label>
              Từ ngày thông báo
              <input
                type="date"
                value={from}
                onChange={(e) => filter(setFrom,e.target.value,from)}
              />
            </label>
            <label>
              Đến ngày thông báo
              <input
                type="date"
                value={to}
                onChange={(e) => filter(setTo,e.target.value,to)}
              />
            </label>
            <button
              onClick={async () => {
                if(read==='all'&&category==='all'&&!q&&!from&&!to)return;
                generation.current++;setData(null);setLoaded('');setError('');
                setRead("all");
                setCategory("all");
                setQ("");
                setFrom("");
                setTo("");
              }}
            >
              Xóa bộ lọc thông báo
            </button>
          </FilterPanel></fieldset>
          {data && (
            <p className="muted">
              {data.total} kết quả · {data.unreadCount} chưa đọc theo loại/tìm
              kiếm/khoảng ngày, không theo trạng thái đọc · Mới tạo trước
            </p>
          )}
        </>
      )}
      {invalid && !id && (
        <InlineMessage>
          Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
        </InlineMessage>
      )}
      {error && <InlineMessage><span>{error}</span><button disabled={busy||mutating} onClick={()=>setRevision(value=>value+1)}>Tải lại để kiểm tra</button></InlineMessage>}
      {notice && <InlineMessage tone="info">{notice}</InlineMessage>}
      {busy && <LoadingState>Đang tải thông báo…</LoadingState>}
      {!id && <p className="notification-preferences">Email công việc được cấu hình riêng trong <a href="#settings">Tùy chọn email</a>.</p>}
      {data &&
        (id ? (
          row(data.notification)
        ) : (
          <>
            {[[false,'Mới và chưa đọc'],[true,'Đã đọc trước đó']].map(([isRead,label])=>{const items=data.items.filter(note=>Boolean(note.readAt)===isRead);return items.length?<section className="notification-group" key={label} aria-label={label}><div className="notification-group-heading"><h2>{label}</h2><p>{items.length} mục đã tải</p></div>{items.map(row)}</section>:null;})}
            {!data.items.length && (
              <EmptyState>
                <h2>Không có thông báo phù hợp</h2>
              </EmptyState>
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
