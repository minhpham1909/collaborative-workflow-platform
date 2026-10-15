import useLiveRefresh from '../../lib/useLiveRefresh.js';
import CollectionLoadMore from '../../components/CollectionLoadMore.jsx';
import CollectionView,{useCollectionView} from '../../components/CollectionView.jsx';
import {rememberInboxPosition,takeInboxPosition} from './inbox-position.js';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workflowText } from '../../lib/workflow-text.js';
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
const categories = { work:'Công việc', invitation:'Lời mời Workspace', membership:'Tham gia Workspace', project_invitation:'Lời mời Guest' };
const noteIcon = note => !note.available ? 'archive' : note.category==='work' ? note.changes.includes('comment')?'document':'tasks' : 'people';
const changed = () => window.dispatchEvent(new Event("workflow-inbox-changed"));
function Content({ note }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => workflowText(value, locale, values);
  if (!note.available)
    return (
      <>
        <h3>{tr("Nội dung không còn khả dụng")}</h3>
        <p>{tr("Bạn vẫn có thể đánh dấu thông báo này đã đọc.")}</p>
      </>
    );
  const p = note.payload;
  if (note.category === "project_invitation")
    return (
      <>
        <h3>{tr("Lời mời xem {name}", { name: p.projectName })}</h3>
        <p>{tr("{name} mời bạn xem và bình luận trong Project này.", { name: p.inviterDisplayName })}</p>
        <p>Workspace: {p.workspaceName}</p>
        <p>{tr("Hết hạn")} {new Date(p.expiresAt).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
      </>
    );
  if (note.category === "membership")
    return (
      <>
        <h3>{tr("Bạn đã được thêm vào {name}", { name: p.workspaceName })}</h3>
        <p>{tr("{name} đã thêm bạn vào Workspace.", { name: p.actorDisplayName })}</p>
      </>
    );
  return note.category === "invitation" ? (
    <>
      <h3>{tr("Lời mời tham gia {name}", { name: p.workspaceName })}</h3>
      <p>{tr("{name} mời bạn vào Workspace.", { name: p.inviterDisplayName })}</p>
      <p>
        {tr("Hết hạn")}{" "}
        {new Date(p.expiresAt).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", {
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
                assignment: tr("Phân công"),
                comment: tr("Bình luận mới"),
                content: tr("Nội dung/deadline"),
                status: tr("Trạng thái"),
              })[v] ?? v,
          )
          .join(" · ")}
      </p>
    </>
  );
}
export function InboxBadge({ api, userId }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => workflowText(value, locale, values);
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
          ? t(tr("Chưa tải số thông báo chưa đọc"))
          : t(tr("{count} thông báo chưa đọc"), { count }) + (stale ? t(tr(", cần tải lại")) : '')
      }
      className="inbox-badge"
    >
      {count === null ? "…" : count > 99 ? "99+" : count}
      {stale ? " ?" : ""}
    </span>
  );
}
export default function Notifications({ api, id, user }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => workflowText(value, locale, values);
  const [view,setView]=useCollectionView(user.id,'notifications',['detailed','compact'],'detailed');
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
  useLiveRefresh(() => setRevision(value => value + 1));
  const generation = useRef(0),
    pending = useRef(false),
    invalid = from && to && from > to;
  useDraftGuard({ dirty:false, busy:mutating, message:tr("Thông báo đang được xử lý.") });
  function filter(setter,value,current) {if(value===current)return;if(setter===setQ&&value.trim()===current.trim()){setter(value);return;}generation.current++;setData(null);setLoaded('');setError('');setter(value);}
  const query = new URLSearchParams({
    limit: "12",
    read,
    category,
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();
  const [returnPosition]=useState(()=>!id?takeInboxPosition(user.id,query):null);
  const restored=useRef(false),restorationReady=useRef(false);
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
      if (!cursor && !id && returnPosition && !restored.current && returnPosition.query===query) {
        let pages=1;
        while(result.nextCursor && pages<returnPosition.pages && token===generation.current){
          const more=await api.request('/notifications?'+query+'&cursor='+encodeURIComponent(result.nextCursor));
          result.items=[...result.items,...more.items].filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i);
          result.nextCursor=more.nextCursor;pages++;
        }
        if(token===generation.current)restorationReady.current=true;
      }
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
        if(!cursor||[401,403,404].includes(e.status))setData(null);
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
  useEffect(()=>{
    if(id||busy||!data||!restorationReady.current||restored.current)return;
    restored.current=true;
    const frame=requestAnimationFrame(()=>{
      const anchor=document.querySelector('[data-note-id="'+returnPosition.anchorId+'"]');
      window.scrollTo(0,anchor?anchor.getBoundingClientRect().top+window.scrollY-returnPosition.offset:returnPosition.scrollY);
    });return()=>cancelAnimationFrame(frame);
  },[id,busy,data]);
  function remember(event,note){
    if(id||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const rect=event.currentTarget.closest('[data-note-id]').getBoundingClientRect();
    rememberInboxPosition(user.id,query,note.id,rect.top,window.scrollY,data.items.length);
  }
  async function mutate(path, body, kind) {
    if (pending.current || uncertain) return;
    pending.current = true;
    setMutating(true);
    setError("");
    setNotice("");
    try {
      if (kind === 'all' && !(await confirmDialog(tr("Đánh dấu các thông báo chưa đọc theo loại, từ khóa và khoảng ngày hiện tại? Không phụ thuộc tab Đã đọc/Chưa đọc và bao gồm các trang chưa tải. Thông báo mới hơn lần tải này vẫn được giữ chưa đọc."), { title:tr("Đánh dấu đã đọc"), confirmLabel:tr("Đánh dấu đã đọc") }))) return;
      const result = await api.request(path, { method: "POST", body });
      setNotice(
        kind === "acceptProject"
          ? tr("Đã được cấp quyền xem và bình luận Project.")
          : kind === "accept"
          ? tr("Đã tham gia Workspace. Mở Trang chủ để chọn nhóm.")
          : kind === "all"
            ? `Đã đánh dấu ${result.markedCount} thông báo đã đọc.`
            : tr("Đã đánh dấu đã đọc."),
      );
      changed();
      setRevision((v) => v + 1);
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        isUncertainMutation(e) ? tr("Chưa xác nhận kết quả. Tải lại trước khi thử tiếp.") : messageFor(e),
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
        data-note-id={note.id}
      >
        <span className="note-icon" aria-hidden="true"><Icon name={noteIcon(note)}/></span><div className="note-body">
        <div className="note-category">{tr(categories[note.category] ?? "Thông báo")}</div>
        <p className="muted">
          {note.readAt ? tr("Đã đọc") : tr("● Chưa đọc")} ·{" "}
          {new Date(note.createdAt).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </p>
        <Content note={note} />
        <div className="buttons">
          {!id && <a onClick={event=>remember(event,note)} href={`#notification/${note.id}?returnTo=${encodeURIComponent('#notifications?'+query)}`}>{tr("Xem chi tiết")}</a>}
          {!note.readAt && (
            <button
              disabled={mutating || busy || uncertain}
              onClick={() =>
                mutate(`/notifications/${note.id}/read`, {}, "one")
              }
            >{tr("Đánh dấu đã đọc")}</button>
          )}
          {note.available && note.target?.type === "task" && (
            <a onClick={event=>remember(event,note)} href={`#task/${note.target.taskId}?returnTo=${encodeURIComponent(id?inboxReturn():'#notifications?'+query)}`}>{tr("Mở Task →")}</a>
          )}
          {note.available && note.target?.type === "workspace" && (
            <a href={`#workspace/${note.target.workspaceId}`}>{tr("Mở Workspace →")}</a>
          )}
          {id && note.available && note.target?.type === "project_invitation" && (
            user.emailVerified ? (
              <button className="primary" disabled={mutating || busy || uncertain} onClick={() => mutate(
                `/project-invitations/${note.target.invitationId}/accept`, {}, "acceptProject",
              )}>{tr("Chấp nhận quyền Guest")}</button>
            ) : <p className="archive-banner">{tr("Xác minh email trước khi tham gia Project.")}</p>
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
              >{tr("Tham gia Workspace")}</button>
            ) : (
              <p className="archive-banner">{tr("Xác minh email trước khi tham gia Workspace.")}</p>
            ))}
        </div></div>
      </article>
    );
  }
  return (
    <main className={'studio-notifications '+(!id?'notification-view-'+view:'')}>
      {id && (
        <p className="breadcrumbs">
          <a href={inboxReturn()}>{tr("Thông báo")}</a> / {tr("Chi tiết")}
        </p>
      )}
      <section className="hero notification-hero">
        <div>
          <small>{tr("NHỮNG CẬP NHẬT DÀNH CHO BẠN")}</small>
          <h1>{id ? tr("Chi tiết thông báo") : tr("Thông báo")}</h1>
          <p>{tr("Những thay đổi công việc và lời mời liên quan đến bạn.")}</p>
        </div>
        <div className="buttons">

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
            >{tr("Đánh dấu tất cả đã đọc")}</button>
          )}
        </div>
      </section>
      {!id && (
        <>

          <div className="notification-quick" aria-label={tr("Lọc nhanh thông báo")}>{[['all',tr("Tất cả thông báo")],['unread',tr("Chưa đọc")],['read',tr("Đã đọc")]].map(([value,label])=><button key={value} disabled={mutating} aria-pressed={read===value} onClick={()=>filter(setRead,value,read)}>{tr(label)}</button>)}</div>
          <fieldset className="notification-filter-fields" disabled={mutating}><FilterPanel toolbar={<CollectionView view={view} onChange={setView} locale={locale}/>} locale={locale} compact advancedLabel={tr("Lọc nâng cao")}>
            <label>{tr("Trạng thái đọc")}<select
                aria-label={tr("Trạng thái đọc")}
                value={read}
                onChange={(e) => filter(setRead,e.target.value,read)}
              >
                <option value="all">{tr("Tất cả")}</option>
                <option value="unread">{tr("Chưa đọc")}</option>
                <option value="read">{tr("Đã đọc")}</option>
              </select>
            </label>
            <label>{tr("Loại thông báo")}<select
                aria-label={tr("Loại thông báo")}
                value={category}
                onChange={(e) => filter(setCategory,e.target.value,category)}
              >
                <option value="all">{tr("Tất cả loại")}</option>
                <option value="work">{tr("Công việc")}</option>
                <option value="invitation">{tr("Lời mời")}</option>
                <option value="membership">{tr("Tham gia Workspace")}</option>
                <option value="project_invitation">{tr("Lời mời Guest")}</option>
              </select>
            </label>
            <label>{tr("Tìm thông báo")}<input
                type="search"
                placeholder={tr("Nhập để tìm kiếm…")}
                maxLength={200}
                value={q}
                onChange={(e) => filter(setQ,e.target.value,q)}
              />
            </label>
            <label>{tr("Từ ngày thông báo")}<input
                type="date"
                value={from}
                onChange={(e) => filter(setFrom,e.target.value,from)}
              />
            </label>
            <label>{tr("Đến ngày thông báo")}<input
                type="date"
                value={to}
                onChange={(e) => filter(setTo,e.target.value,to)}
              />
            </label>
            <button
              onClick={async () => {
                if(read==='all'&&category==='all'&&!q.trim()&&!from&&!to){setQ('');return;}
                generation.current++;setData(null);setLoaded('');setError('');
                setRead("all");
                setCategory("all");
                setQ("");
                setFrom("");
                setTo("");
              }}
            >{tr("Xóa bộ lọc thông báo")}</button>
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
        <InlineMessage>{tr("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")}</InlineMessage>
      )}
      {error && <InlineMessage><span>{tr(error)}</span><button disabled={busy||mutating} onClick={()=>setRevision(value=>value+1)}>{tr("Tải lại để kiểm tra")}</button></InlineMessage>}
      {notice && <InlineMessage tone="info">{tr(notice)}</InlineMessage>}
      {busy && <LoadingState>{tr("Đang tải thông báo…")}</LoadingState>}
      {!id && <p className="notification-preferences">{tr("Email công việc được cấu hình riêng trong")}<a href="#settings">{tr("Tùy chọn email")}</a>.</p>}
      {data &&
        (id ? (
          row(data.notification)
        ) : (
          <>
            {[[false,tr("Mới và chưa đọc")],[true,tr("Đã đọc trước đó")]].map(([isRead,label])=>{const items=data.items.filter(note=>Boolean(note.readAt)===isRead);return items.length?<section className="notification-group" key={tr(label)} aria-label={tr(label)}><div className="notification-group-heading"><h2>{tr(label)}</h2><p>{tr("{count} mục đã tải", {count:items.length})}</p></div><div className="notification-items">{items.map(row)}</div></section>:null;})}
            {!data.items.length && (
              <EmptyState>
                <h2>{tr("Không có thông báo phù hợp")}</h2>
              </EmptyState>
            )}
            {data.nextCursor && <CollectionLoadMore cursor={data.nextCursor} busy={busy||mutating} error={error} queryKey={query} onLoad={load} locale={locale}/>}
          </>
        ))}
    </main>
  );
}
